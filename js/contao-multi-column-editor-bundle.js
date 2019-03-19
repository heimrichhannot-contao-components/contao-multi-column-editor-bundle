import Sortable from 'sortablejs';

class MultiColumnEditorBundle {
    static init() {
        let mce = document.querySelectorAll('.multi-column-editor');

        if (mce.length < 1)
        {
            return;
        }

        let isBackend = mce[0].dataset.env === 'backend';

        utilsBundle.event.addDynamicEventListener('click', '.multi-column-editor .add', function(item, event) {
            event.preventDefault();
            MultiColumnEditorBundle.triggerAction(isBackend, item, 'addRow');
        });

        utilsBundle.event.addDynamicEventListener('click', '.multi-column-editor .delete', function(item, event) {
            event.preventDefault();
            MultiColumnEditorBundle.triggerAction(isBackend, item, 'deleteRow');
        });

        MultiColumnEditorBundle.initSortable(isBackend);
    }

    static initSortable(isBackend) {
        if (isBackend)
        {
            new Sortables('.multi-column-editor-wrapper .sortable', {
                constrain: true,
                opacity: 0.6,
                handle: '.drag-handle',
                onComplete: function(row) {
                    var newIndices = [],
                        doPost = false,
                        rows = row.closest('.rows').querySelectorAll('.mce-row');

                    for (var i = 0; i < rows.length; i++) {
                        newIndices.push(rows[i].dataset.index);

                        if (rows[i].dataset.index !== [].slice.call(rows).indexOf(this) + 1) {
                            doPost = true;
                        }
                    }

                    let additionalData = [
                        {
                            'name': 'newIndices',
                            'value': newIndices.join(',')
                        }
                    ];

                    if (doPost) {
                        MultiColumnEditorBundle.triggerAction(isBackend, row.querySelector('.drag-handle'), 'sortRows', additionalData);
                    }
                }
            });
        }
        else
        {
            let sortables = document.querySelectorAll('.multi-column-editor-wrapper .sortable');

            sortables.forEach(function(item) {
                Sortable.create(item, {
                    'handle' : '.drag-handle',
                    onEnd: function(event) {
                        let newIndices = [],
                            doPost = false,
                            rows = event.item.closest('.rows').querySelectorAll('.mce-row');

                        for (let i = 0; i < rows.length; i++) {
                            newIndices.push(rows[i].dataset.index);

                            if (rows[i].dataset.index !== Array.prototype.indexOf.call(sortables, item) + 1) {
                                doPost = true;
                            }
                        }

                        let additionalData = [
                            {
                                'name': 'newIndices',
                                'value': newIndices.join(',')
                            }
                        ];

                        if (doPost) {
                            MultiColumnEditorBundle.triggerAction(isBackend, event.item.querySelector('.drag-handle'), 'sortRows', additionalData);
                        }
                    },
                });
            });
        }
    }

    static triggerAction(isBackend, link, action, additionalFormData, callback) {
        let form = link.closest('form'),
            formData = new FormData(),
            editor = link.closest('.multi-column-editor'),
            url = link.href;

        form.querySelectorAll(
            'input[name]:not([disabled]), textarea[name]:not([disabled]), select[name]:not([disabled]), button[name]:not([disabled])'
        ).forEach(function(input) {
            // remove FORM_SUBMIT -> no submit callbacks should be fired
            if (input.name !== 'FORM_SUBMIT') {
                switch (input.type)
                {
                    case 'checkbox':
                    case 'radio':
                        formData.append(input.name, input.checked ? input.value : '');
                        break;
                    default:
                        formData.append(input.name, input.value);
                }
            }
        });

        let row = link.closest('.mce-row');

        formData.set('row', typeof row !== 'undefined' && row !== null ? row.dataset.index : 0);
        formData.set('field', editor.dataset.field);
        formData.set('table', editor.dataset.table);
        formData.set('action', action);

        if (typeof additionalFormData !== 'undefined') {
            additionalFormData.forEach(function(input) {
                // remove FORM_SUBMIT -> no submit callbacks should be fired
                if (input.name !== 'FORM_SUBMIT') {
                    switch (input.type)
                    {
                        case 'checkbox':
                        case 'radio':
                            formData.append(input.name, input.checked ? input.value : '');
                            break;
                        default:
                            formData.append(input.name, input.value);
                    }
                }
            });
        }

        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                // dispatch custom event
                let customEvent = document.createEvent('CustomEvent');
                customEvent.initEvent('ajaxSuccess', true, true);
                document.dispatchEvent(customEvent);

                if (xhr.status === 200) {
                    if (isBackend)
                    {
                        var response = document.createElement('div');
                        response.innerHTML = xhr.responseText;

                        var scriptElements = response.childNodes[0].getElementsByTagName('script');

                        link.closest('.multi-column-editor-wrapper').replaceWith(response.childNodes[0]);
                        MultiColumnEditorBundle.initChosen();
                        MultiColumnEditorBundle.initSortable(isBackend);

                        for (var n = 0; n < scriptElements.length; n++)
                        {
                            eval(arr[n].innerHTML);
                        }

                        if (typeof callback === 'function') {
                            callback.apply(this, Array.prototype.slice.call(arguments, 1));
                        }

                        var e = document.createEvent('CustomEvent');
                        e.initEvent('ajaxComplete', true, true);
                        document.dispatchEvent(e);
                    }
                    else {
                        let data = JSON.parse(xhr.responseText);

                        let response = document.createElement('div');
                        response.innerHTML = data.result.html;

                        link.closest('.multi-column-editor-wrapper').replaceWith(response.childNodes[0]);

                        MultiColumnEditorBundle.initSortable(isBackend);

                        if (typeof callback === 'function') {
                            callback.apply(this, Array.prototype.slice.call(arguments, 1));
                        }

                        customEvent = document.createEvent('CustomEvent');
                        customEvent.initEvent('ajaxComplete', true, true);
                        document.dispatchEvent(customEvent);
                    }
                }
            }
        };

        xhr.open('POST', url);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.send(formData);
    }
}

document.addEventListener('DOMContentLoaded', MultiColumnEditorBundle.init);

// backend only
(function() {
    if (typeof window.addEvent === 'function') {
        window.addEvent('domready', function() {
            MultiColumnEditorBundle.initChosen = function() {
                $$('.multi-column-editor select.tl_chosen').each(function(el) {
                    if (typeof el.initialized === 'undefined') {
                        el.initialized = $$('#' + el.getAttribute('id')).chosen();
                    }
                });
            };
        });
    }
})();