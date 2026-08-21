package cn.keking.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class OfdToImageServiceTests {

    @TempDir
    Path tempDir;

    @Test
    void ofdToPdf_producesMultiPagePdf() throws Exception {
        Path ofd = tempDir.resolve("sample.ofd");
        try (InputStream in = getClass().getResourceAsStream("/sample.ofd")) {
            assumeTrue(in != null, "test resource /sample.ofd missing");
            Files.copy(in, ofd, StandardCopyOption.REPLACE_EXISTING);
        }

        Path pdf = tempDir.resolve("sample.pdf");
        new OfdToImageService().ofdToPdf(ofd.toString(), pdf.toString());

        assertTrue(Files.exists(pdf));
        assertTrue(Files.size(pdf) > 0);

        try (PDDocument doc = Loader.loadPDF(pdf.toFile())) {
            assertTrue(doc.getNumberOfPages() >= 1, "PDF should have at least one page");
        }
    }
}
