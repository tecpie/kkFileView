<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>${file.name}预览</title>
    <link rel='stylesheet' href='xlsx/plugins/css/pluginsCss.css' />
    <link rel='stylesheet' href='xlsx/plugins/plugins.css' />
    <link rel='stylesheet' href='xlsx/css/luckysheet.css' />
    <link rel='stylesheet' href='xlsx/assets/iconfont/iconfont.css' />
    <script src="xlsx/plugins/js/plugin.js"></script>
    <script src="xlsx/luckysheet.umd.js"></script>
    <script src="js/watermark.js" type="text/javascript"></script>
    <script src="js/base64.min.js" type="text/javascript"></script>
</head>
<#if pdfUrl?contains("http://") || pdfUrl?contains("https://") || pdfUrl?contains("ftp://")>
    <#assign finalUrl="${pdfUrl}">
<#else>
    <#assign finalUrl="${baseUrl}${pdfUrl}">
</#if>
<script>
    /**
     * 初始化水印
     */
    function initWaterMark() {
        let watermarkTxt = '${watermarkTxt}';
        if (watermarkTxt !== '') {
            watermark.init({
                watermark_txt: '${watermarkTxt}',
                watermark_x: 0,
                watermark_y: 0,
                watermark_rows: 0,
                watermark_cols: 0,
                watermark_x_space: ${watermarkXSpace},
                watermark_y_space: ${watermarkYSpace},
                watermark_font: '${watermarkFont}',
                watermark_fontsize: '${watermarkFontsize}',
                watermark_color: '${watermarkColor}',
                watermark_alpha: ${watermarkAlpha},
                watermark_width: ${watermarkWidth},
                watermark_height: ${watermarkHeight},
                watermark_angle: ${watermarkAngle},
            });
        }
    }

    // 添加加载状态管理
    let isLoading = false;
    var luckysheetReady = false;
    var pendingExcelHighlight = null;
    var highlightReadySent = false;
    var highlightPainting = false;
    var lastHighlightKey = '';

</script>
<style>
    * {
        margin: 0;
        padding: 0;
    }

    html, body {
        height: 100%;
        width: 100%;
        overflow: hidden;
    }

    #loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        z-index: 9999;
        transition: opacity 0.3s ease;
    }

    #loading-progress {
        width: 300px;
        height: 20px;
        background: #f0f0f0;
        border-radius: 10px;
        margin-top: 20px;
        overflow: hidden;
    }

    #loading-bar {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
        border-radius: 10px;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #4CAF50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .loading-text {
        margin-top: 20px;
        font-size: 16px;
        color: #666;
    }

    .error-message {
        display: none;
        background: #ffebee;
        border: 1px solid #ffcdd2;
        border-radius: 4px;
        padding: 20px;
        margin: 20px;
        text-align: center;
    }

    /*
     * 宿主抽屉会裁切 iframe 底部约 40px+。
     * 把整个 Luckysheet 上收，让 sheet 栏落在裁切线之上。
     */
    #luckysheet {
        top: 0 !important;
        bottom: auto !important;
        height: calc(100% - 60px) !important;
    }
    #luckysheet-sheet-area {
        z-index: 10050 !important;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        bottom: 3px !important;
        left: 0 !important;
        right: 0 !important;
        height: 31px !important;
        background: #f0f0f0 !important;
        border-top: 1px solid #c8c8c8 !important;
        padding-left: 8px !important;
        box-sizing: border-box !important;
    }
    #luckysheet-sheet-container,
    #luckysheet-sheet-container-c {
        display: inline-block !important;
        max-width: none !important;
        overflow: visible !important;
    }
    #luckysheet-grid-window-1 {
        bottom: 34px !important;
    }
    /* 逐格上色时不依赖 Luckysheet 选区框 */
    #luckysheet-cell-selected-boxs #luckysheet-cell-selected,
    #luckysheet-cell-selected-boxs .luckysheet-cell-selected {
        display: none !important;
    }

</style>
<body>
<!-- 添加加载遮罩层 -->
<div id="loading-overlay">
    <div class="spinner"></div>
    <div class="loading-text">正在加载Excel文件...</div>
    <div id="loading-progress">
        <div id="loading-bar"></div>
    </div>
</div>

<!-- 错误提示 -->
<div id="error-message" class="error-message">
    <h3>加载失败</h3>
    <p id="error-detail"></p>
    <button onclick="retryLoad()" style="margin-top: 10px; padding: 8px 16px;">重试</button>
</div>

<div id="lucky-mask-demo" style="position: absolute;z-index: 1000000;left: 0px;top: 0px;bottom: 0px;right: 0px; background: rgba(255, 255, 255, 0.8); text-align: center;font-size: 40px;align-items:center;justify-content: center;display: none;">加载中</div>

<div id="luckysheet" style="margin:0;padding:0;position:absolute;width:100%;left:0;top:0;outline:none;"></div>

<script src="xlsx/luckyexcel.umd.js"></script>
<script>
    var url = '${finalUrl}';
   	var kkagent = '${kkagent}';
    var baseUrl = '${baseUrl}'.endsWith('/') ? '${baseUrl}' : '${baseUrl}' + '/';
    if (kkagent === 'true' || !url.startsWith(baseUrl)) {
        url = baseUrl + 'getCorsFile?urlPath=' + encodeURIComponent(Base64.encode(url))+ "&key=${kkkey}";
    }

    let mask = document.getElementById("lucky-mask-demo");
    let loadingOverlay = document.getElementById("loading-overlay");
    let loadingBar = document.getElementById("loading-bar");
    let errorMessage = document.getElementById("error-message");

    // 更新加载进度
    function updateProgress(percent) {
        if (loadingBar) {
            loadingBar.style.width = percent + '%';
        }
    }

    // 显示错误信息
    function showError(message) {
        hideLoading();
        errorMessage.style.display = 'block';
        document.getElementById('error-detail').textContent = message;
    }

    // 隐藏加载动画
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
    }

    // 重试加载
    function retryLoad() {
        errorMessage.style.display = 'none';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadTextAsync();
    }

    // 异步加载Excel文件
    async function loadTextAsync() {
        if (isLoading) return;

        isLoading = true;
        updateProgress(10);

        try {
            initWaterMark();

            const value = url;
            const name = '${file.name}';

            if (!value) {
                showError('文件URL为空');
                return;
            }

            updateProgress(30);

            // 使用异步方式加载
            await new Promise(resolve => setTimeout(resolve, 100)); // 给UI更新一点时间

            const exportJson = await transformWithWorker(value, name);

            updateProgress(80);

            await createLuckysheet(exportJson);

            updateProgress(100);

            // 延迟隐藏加载界面，让用户看到加载完成
            setTimeout(() => {
                hideLoading();
                isLoading = false;
            }, 500);

        } catch (error) {
            console.error('加载Excel失败:', error);
            showError('加载失败: ' + error.message);
            isLoading = false;
        }
    }

    function transformWithWorker(value, name) {
        return new Promise((resolve, reject) => {
            updateProgress(50);

            if (!window.Worker) {
                transformOnMainThread(value, name, resolve, reject);
                return;
            }

            let worker;
            try {
                worker = new Worker('xlsx/luckyexcel-worker.js');
            } catch (error) {
                transformOnMainThread(value, name, resolve, reject);
                return;
            }

            let settled = false;
            const fallbackToMainThread = function(error) {
                if (settled) {
                    return;
                }
                settled = true;
                worker.terminate();
                if (error) {
                    console.warn('Excel Worker转换失败，回退主线程转换:', error);
                }
                transformOnMainThread(value, name, resolve, reject);
            };

            worker.onmessage = function(event) {
                const data = event.data || {};

                if (data.type === 'success') {
                    settled = true;
                    worker.terminate();
                    resolve(data.exportJson);
                    return;
                }

                if (data.type === 'error') {
                    fallbackToMainThread(data.message || 'Excel转换失败');
                }
            };

            worker.onerror = function(error) {
                fallbackToMainThread(error && error.message ? error.message : error);
            };

            worker.postMessage({
                url: value,
                name: name
            });
        });
    }

    function transformOnMainThread(value, name, resolve, reject) {
        try {
            LuckyExcel.transformExcelToLuckyByUrl(value, name, function(exportJson, luckysheetfile) {
                if (!exportJson || !exportJson.sheets || exportJson.sheets.length === 0) {
                    reject(new Error("读取excel文件内容失败!"));
                    return;
                }

                resolve(exportJson);
            }, function(error) {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    }

    function createLuckysheet(exportJson) {
        return new Promise((resolve, reject) => {
            requestAnimationFrame(() => {
                try {
                    installMutedEchoWorkers();
                    window.luckysheet.destroy();
                    window.luckysheet.create({
                        container: 'luckysheet',
                        lang: "zh",
                        showtoolbarConfig:{
                            image: false,
                            print: false,
                            exportXlsx: false,
                        },
                        allowCopy: true,
                        showtoolbar: ${xlsxshowtoolbar?string('true','false')},
                        showinfobar: false,
                        showsheetbar: true,
                        showstatisticBar: false,
                        allowEdit: ${(xlsxallowEdit!false)?string('true','false')},
                        enableAddRow: false,
                        enableAddCol: false,
                        userInfo: false,
                        showRowBar: true,
                        showColumnBar: true,
                        sheetFormulaBar: false,
                        enableAddBackTop: false,
                        forceCalculation: false,
                        data: exportJson.sheets,
                        title: exportJson.info.name,
                        hook: {
                            workbookCreateAfter: function() {
                                luckysheetReady = true;
                                try {
                                    if (typeof window.luckysheet.resize === 'function') {
                                        window.luckysheet.resize();
                                    }
                                } catch (e) {}
                                // 等表格首屏稳定后再高亮/通知宿主，避免与初始化抢 Worker
                                setTimeout(function () {
                                    if (pendingExcelHighlight) {
                                        applyExcelHighlight(pendingExcelHighlight);
                                        pendingExcelHighlight = null;
                                    }
                                    try {
                                        if (!highlightReadySent && window.parent && window.parent !== window) {
                                            highlightReadySent = true;
                                            window.parent.postMessage({ type: 'kk-highlight-ready' }, '*');
                                        }
                                    } catch (e) {}
                                }, 400);
                                resolve();
                            }
                        }
                    });

                    updateProgress(90);

                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    // 页面加载完成后开始异步加载
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟一点时间开始加载，确保DOM完全加载
        setTimeout(() => {
            loadTextAsync();
        }, 100);
    });

    // 添加取消加载的功能（按ESC键）
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isLoading) {
            // 可以在这里添加取消加载的逻辑
            console.log('用户取消了加载');
        }
    });

    function normalizeExcelRects(msg) {
        // 宿主（ai-vue）与 PDF viewer 统一用 data；兼容旧 rects
        var raw = msg.data != null ? msg.data : msg.rects;
        if (!raw) {
            return null;
        }
        if (!Array.isArray(raw) || raw.length === 0) {
            return null;
        }
        if (typeof raw[0] === 'number') {
            return [raw];
        }
        if (Array.isArray(raw[0])) {
            return raw;
        }
        return null;
    }

    var lastPaintedRange = null;
    var EXCEL_HIGHLIGHT_BG = '#ffe58f';

    /**
     * Luckysheet 用 data: URL Worker 做 flowdata 深拷贝；每次改格子都会
     * new Worker，Network 里刷 data:text/javascript 且卡顿。
     * 预览场景改为同步深拷贝即可（LuckyExcel 仍用真实 worker 文件）。
     */
    function installMutedEchoWorkers() {
        if (window.__kkMutedEchoWorkers || !window.Worker) {
            return;
        }
        var OrigWorker = window.Worker;
        function MuteWorker(scriptUrl) {
            if (typeof scriptUrl === 'string' && scriptUrl.indexOf('data:text/javascript') === 0) {
                return {
                    onmessage: null,
                    postMessage: function (data) {
                        var cloned;
                        try {
                            cloned = window.jQuery
                                ? window.jQuery.extend(true, [], data)
                                : JSON.parse(JSON.stringify(data));
                        } catch (e) {
                            cloned = data;
                        }
                        if (typeof this.onmessage === 'function') {
                            this.onmessage({ data: cloned });
                        }
                    },
                    terminate: function () {}
                };
            }
            return arguments.length > 1
                ? new OrigWorker(scriptUrl, arguments[1])
                : new OrigWorker(scriptUrl);
        }
        MuteWorker.prototype = OrigWorker.prototype;
        window.Worker = MuteWorker;
        window.__kkMutedEchoWorkers = true;
    }

    function withMutedEchoWorkers(fn) {
        installMutedEchoWorkers();
        fn();
    }

    function clearExcelCellHighlight() {
        if (!lastPaintedRange || !window.luckysheet) {
            return;
        }
        try {
            if (typeof window.luckysheet.setRangeFormat === 'function') {
                withMutedEchoWorkers(function () {
                    window.luckysheet.setRangeFormat('bg', null, {
                        range: lastPaintedRange
                    });
                });
            }
        } catch (err) {}
        lastPaintedRange = null;
    }

    function buildHighlightKey(sheetOrder, rowStart, rowEnd, colStart, colEnd) {
        return sheetOrder + '|' + rowStart + '|' + rowEnd + '|' + colStart + '|' + colEnd;
    }

    function applyExcelHighlight(msg) {
        if (!window.luckysheet || highlightPainting) {
            return;
        }
        var rects = normalizeExcelRects(msg);
        var rect = (rects && rects[0]) || null;
        var sheetOrder = (msg.sheetIndex != null ? msg.sheetIndex : (rect ? rect[0] : 1)) - 1;
        var rowStart = (msg.rowStart != null ? msg.rowStart : (rect ? rect[1] : 1)) - 1;
        var rowEnd = (msg.rowEnd != null ? msg.rowEnd : (rect ? rect[2] : rowStart + 1)) - 1;
        var colStart = (msg.colStart != null ? msg.colStart : (rect ? rect[3] : 1)) - 1;
        var colEnd = (msg.colEnd != null ? msg.colEnd : (rect ? rect[4] : colStart + 1)) - 1;
        if (sheetOrder < 0) {
            sheetOrder = 0;
        }
        if (rowStart < 0) {
            rowStart = 0;
        }
        if (rowEnd < rowStart) {
            rowEnd = rowStart;
        }
        if (colStart < 0) {
            colStart = 0;
        }
        if (colEnd < colStart) {
            colEnd = colStart;
        }
        if (colStart === 0 && colEnd === 0 && !(rect && Number(rect[3]) > 0)) {
            colEnd = 15;
        }
        var highlightKey = buildHighlightKey(sheetOrder, rowStart, rowEnd, colStart, colEnd);
        if (highlightKey === lastHighlightKey) {
            return;
        }
        /*
         * 整块 range 只调 1 次 setRangeFormat（对齐 RAGFlow 的行/列范围），
         * 并 mute echo Worker，避免 Network 刷屏与加载卡顿。
         */

        function paintRange() {
            highlightPainting = true;
            try {
                if (typeof window.luckysheet.setRangeFormat !== 'function') {
                    return;
                }
                withMutedEchoWorkers(function () {
                    if (lastPaintedRange) {
                        window.luckysheet.setRangeFormat('bg', null, {
                            range: lastPaintedRange
                        });
                    }
                    var range = { row: [rowStart, rowEnd], column: [colStart, colEnd] };
                    window.luckysheet.setRangeFormat('bg', EXCEL_HIGHLIGHT_BG, {
                        range: range
                    });
                    lastPaintedRange = {
                        row: [rowStart, rowEnd],
                        column: [colStart, colEnd]
                    };
                });
                lastHighlightKey = highlightKey;
                if (msg.scroll !== false && typeof window.luckysheet.scroll === 'function') {
                    window.luckysheet.scroll({
                        targetRow: rowStart,
                        targetColumn: colStart
                    });
                }
            } catch (err) {
                console.warn('applyExcelHighlight paint failed', err);
            } finally {
                highlightPainting = false;
            }
        }

        function runPaint() {
            var needSwitch = true;
            try {
                if (typeof window.luckysheet.getSheet === 'function') {
                    var cur = window.luckysheet.getSheet();
                    needSwitch = !cur || cur.order !== sheetOrder;
                }
            } catch (e) {}
            if (needSwitch && typeof window.luckysheet.setSheetActive === 'function') {
                window.luckysheet.setSheetActive(sheetOrder, {
                    success: function () {
                        setTimeout(paintRange, 30);
                    }
                });
            } else {
                paintRange();
            }
        }

        try {
            runPaint();
        } catch (err) {
            console.warn('applyExcelHighlight failed', err);
            paintRange();
        }
    }

    window.addEventListener('message', function (event) {
        var msg = event.data;
        if (!msg || msg.type !== 'kk-set-highlight') {
            return;
        }
        // 宿主通常不带 mode；仅在明确声明非 excel 时忽略
        if (msg.mode && msg.mode !== 'excel') {
            return;
        }
        if (!luckysheetReady) {
            pendingExcelHighlight = msg;
            return;
        }
        applyExcelHighlight(msg);
    });

    window.addEventListener('resize', function () {
        if (!luckysheetReady || !window.luckysheet || typeof window.luckysheet.resize !== 'function') {
            return;
        }
        try {
            window.luckysheet.resize();
        } catch (e) {}
    });
</script>
</body>
</html>
