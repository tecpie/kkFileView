package cn.keking;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class PdfViewerCompatibilityTests {

    @Test
    void shouldLoadCompatibilityModuleBeforePdfJs() throws IOException {
        String viewerHtml = readResource("/static/pdfjs/web/viewer.html");

        assertTrue(viewerHtml.contains("<script src=\"compatibility.mjs\" type=\"module\"></script>"));
        assertTrue(viewerHtml.indexOf("compatibility.mjs") < viewerHtml.indexOf("../build/pdf.mjs"));
    }

    @Test
    void shouldLoadCompatibilityModuleInPdfWorker() throws IOException {
        String workerScript = readResource("/static/pdfjs/build/pdf.worker.mjs");

        assertTrue(workerScript.contains("import \"../web/compatibility.mjs\";"));
    }

    @Test
    void shouldRenderPdfSidebarModeByDefaultBasedOnConfig() throws IOException {
        String pdfTemplate = readResource("/web/pdf.ftl");

        assertTrue(pdfTemplate.contains("<#if \"true\" == pdfSidebarOpen>"));
        assertTrue(pdfTemplate.contains("viewerUrl += \"&pagemode=bookmarks\";"));
        assertTrue(pdfTemplate.contains("viewerUrl += \"&pagemode=none\";"));
    }

    @Test
    void shouldLoadCompactToolbarAssetsInPdfViewer() throws IOException {
        String viewerHtml = readResource("/static/pdfjs/web/viewer.html");

        assertTrue(viewerHtml.contains("kk-toolbar.css"));
        assertTrue(viewerHtml.contains("kk-toolbar.js"));
        assertTrue(viewerHtml.contains("kk-compact"));
    }

    @Test
    void shouldOverlaySidebarWithoutReflowingViewer() throws IOException {
        String toolbarCss = readResource("/static/pdfjs/web/kk-toolbar.css");

        assertTrue(toolbarCss.contains("viewsManagerOpen #viewerContainer"));
        assertTrue(toolbarCss.contains("inset-inline-start: 0 !important"));
    }

    @Test
    void shouldFitWidePdfPagesWithPerPageScaleFactor() throws IOException {
        String toolbarJs = readResource("/static/pdfjs/web/kk-toolbar.js");
        String toolbarCss = readResource("/static/pdfjs/web/kk-toolbar.css");

        assertTrue(toolbarJs.contains("fitOnePageView"));
        assertTrue(toolbarJs.contains("--scale-factor"));
        assertTrue(toolbarJs.contains("pagerendered"));
        assertTrue(toolbarCss.contains("overflow-x: hidden"));
        assertTrue(!toolbarCss.contains("kk-wide-page"));
    }

    @Test
    void shouldDockChromeToEdgesUntilPointerApproaches() throws IOException {
        String toolbarJs = readResource("/static/pdfjs/web/kk-toolbar.js");
        String toolbarCss = readResource("/static/pdfjs/web/kk-toolbar.css");

        assertTrue(toolbarJs.contains("bindEdgeReveal"));
        assertTrue(toolbarJs.contains("kk-near-"));
        assertTrue(toolbarCss.contains("kk-near-left"));
        assertTrue(toolbarCss.contains("kk-near-bottom"));
        assertTrue(toolbarCss.contains("translateX(-50%)"));
    }

    @Test
    void shouldForwardShowtoolsQueryToPdfViewer() throws IOException {
        String pdfTemplate = readResource("/web/pdf.ftl");

        assertTrue(pdfTemplate.contains("parentParams.get('showtools')"));
        assertTrue(pdfTemplate.contains("viewerUrl += \"&showtools=true\";"));
    }

    @Test
    void shouldNotShowJpgPreviewSwitchOnPdfPage() throws IOException {
        String pdfTemplate = readResource("/web/pdf.ftl");

        assertTrue(!pdfTemplate.contains("jpg.svg"));
        assertTrue(!pdfTemplate.contains("goForImage"));
        assertTrue(!pdfTemplate.contains("img-preview"));
    }

    @Test
    void shouldForwardRegionSelectMessagesBetweenHostAndViewer() throws IOException {
        String pdfTemplate = readResource("/web/pdf.ftl");

        assertTrue(pdfTemplate.contains("kk-start-region-select"));
        assertTrue(pdfTemplate.contains("kk-cancel-region-select"));
        assertTrue(pdfTemplate.contains("kk-region-selected"));
    }

    @Test
    void shouldEnableSingleRegionSelectOverlayOnPdfPages() throws IOException {
        String toolbarJs = readResource("/static/pdfjs/web/kk-toolbar.js");
        String toolbarCss = readResource("/static/pdfjs/web/kk-toolbar.css");

        assertTrue(toolbarJs.contains("kk-start-region-select"));
        assertTrue(toolbarJs.contains("kk-cancel-region-select"));
        assertTrue(toolbarJs.contains("kk-region-selected"));
        assertTrue(toolbarJs.contains("请框选区域"));
        assertTrue(toolbarJs.contains("--scale-factor"));
        assertTrue(toolbarCss.contains("kk-region-selecting"));
        assertTrue(toolbarCss.contains("crosshair"));
    }

    @Test
    void shouldForwardAndApplyAllPdfWatermarkSettings() throws IOException {
        String pdfTemplate = readResource("/web/pdf.ftl");
        String viewerScript = readResource("/static/pdfjs/web/viewer.mjs");
        Map<String, String> watermarkParams = Map.ofEntries(
                Map.entry("watermarktxt", "watermarkTxt"),
                Map.entry("watermarkxspace", "watermarkXSpace"),
                Map.entry("watermarkyspace", "watermarkYSpace"),
                Map.entry("watermarkfont", "watermarkFont"),
                Map.entry("watermarkfontsize", "watermarkFontsize"),
                Map.entry("watermarkcolor", "watermarkColor"),
                Map.entry("watermarkalpha", "watermarkAlpha"),
                Map.entry("watermarkwidth", "watermarkWidth"),
                Map.entry("watermarkheight", "watermarkHeight"),
                Map.entry("watermarkangle", "watermarkAngle")
        );

        watermarkParams.forEach((queryParam, templateAttribute) -> {
            assertTrue(pdfTemplate.contains(queryParam + ": '${" + templateAttribute + "?js_string}'"),
                    () -> "PDF template does not forward " + templateAttribute);
            assertTrue(viewerScript.contains("\"" + queryParam + "\"")
                            || viewerScript.contains("'" + queryParam + "'"),
                    () -> "PDF viewer does not consume " + queryParam);
        });
        assertTrue(viewerScript.contains("div.style.fontFamily = settings.font;"));
        assertTrue(viewerScript.contains("div.style.fontSize = settings.fontsize;"));
        assertTrue(viewerScript.contains("div.style.color = settings.color;"));
        assertTrue(viewerScript.contains("div.style.opacity = settings.alpha;"));
        assertTrue(viewerScript.contains("const xStep = settings.width + settings.x_space;"));
        assertTrue(viewerScript.contains("const yStep = settings.height + settings.y_space;"));
    }

    @Test
    void shouldPreferPdfForOfficePreviewByDefault() throws IOException {
        String properties = readResource("/application.properties");

        assertTrue(properties.contains("office.preview.type = ${KK_OFFICE_PREVIEW_TYPE:pdf}"));
    }

    private String readResource(String resourcePath) throws IOException {
        try (InputStream inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertNotNull(inputStream);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
