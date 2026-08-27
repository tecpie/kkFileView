<!DOCTYPE html>

<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0">
    <title>文件预览</title>
    <#include "*/commonHeader.ftl">
    <#include "*/needFilePasswordHeader.ftl">
</head>
<body>
<iframe id="htmlFrame" src="${pdfUrl}" width="100%" frameborder="0"></iframe>
</body>

<script type="text/javascript">
    needFilePassword();
</script>

<script type="text/javascript">
    var htmlFrame = document.getElementById('htmlFrame');
    htmlFrame.height = document.documentElement.clientHeight - 10;
    window.onresize = function () {
        htmlFrame.height = window.document.documentElement.clientHeight - 10;
    };
    window.onload = function () {
        initWaterMark();
    };

    function highlightTextInDocument(doc, text, scroll) {
        if (!doc || !doc.body || !text) {
            return;
        }
        var needle = String(text).trim();
        if (!needle) {
            return;
        }
        var probe = needle.slice(0, Math.min(needle.length, 80));
        var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            var value = node.nodeValue || '';
            var idx = value.indexOf(probe);
            if (idx < 0) {
                continue;
            }
            var range = doc.createRange();
            range.setStart(node, idx);
            range.setEnd(node, Math.min(idx + needle.length, value.length));
            var mark = doc.createElement('mark');
            mark.style.background = '#ffe58f';
            try {
                range.surroundContents(mark);
                if (scroll !== false) {
                    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } catch (e) {}
            break;
        }
    }

    function applyTextHighlight(msg) {
        try {
            var doc = htmlFrame.contentDocument;
            if (!doc) {
                return;
            }
            highlightTextInDocument(doc, msg.text || '${highlightall?js_string}', msg.scroll);
        } catch (e) {
            console.warn('applyTextHighlight failed', e);
        }
    }

    var pendingTextHighlight = null;
    htmlFrame.addEventListener('load', function () {
        if (pendingTextHighlight) {
            applyTextHighlight(pendingTextHighlight);
            pendingTextHighlight = null;
        } else if ('${highlightall?js_string}') {
            applyTextHighlight({ text: '${highlightall?js_string}', scroll: true });
        }
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'kk-highlight-ready' }, '*');
            }
        } catch (e) {}
    });

    window.addEventListener('message', function (event) {
        var msg = event.data;
        if (!msg || msg.type !== 'kk-set-highlight') {
            return;
        }
        if (msg.mode && msg.mode !== 'text') {
            return;
        }
        if (!htmlFrame.contentDocument) {
            pendingTextHighlight = msg;
            return;
        }
        applyTextHighlight(msg);
    });
</script>
</html>
