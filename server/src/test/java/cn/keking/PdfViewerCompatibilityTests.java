package cn.keking;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

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
