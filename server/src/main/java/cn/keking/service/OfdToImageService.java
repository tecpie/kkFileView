package cn.keking.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Convert OFD to a single PDF for {@code /convert}: render pages to images via
 * ofdrw, then stitch them with PDFBox 3 on the main classpath.
 * <p>
 * ofdrw needs PDFBox 2 ({@code SeparableBlendMode}); an isolated ClassLoader
 * loads {@code classpath:ofd-runtime/*.jar} so it does not clash with app PDFBox 3.
 */
@Service
public class OfdToImageService {

    private static final Logger logger = LoggerFactory.getLogger(OfdToImageService.class);
    private static final double PPM = 15d;
    private static final Object LOCK = new Object();
    private static volatile ClassLoader ofdClassLoader;
    private static volatile boolean ofdFontsConfigured;

    /**
     * @param ofdPath    local OFD file
     * @param pdfOutPath output PDF path (one page per OFD page, image-based)
     */
    public void ofdToPdf(String ofdPath, String pdfOutPath) throws IOException {
        Path ofd = Paths.get(ofdPath);
        Path pdfPath = Paths.get(pdfOutPath);
        Path imgDir = Paths.get(pdfOutPath + ".images");

        deleteRecursively(imgDir);
        Files.createDirectories(imgDir);
        if (pdfPath.getParent() != null) {
            Files.createDirectories(pdfPath.getParent());
        }

        try {
            renderPages(ofd, imgDir);
            Path tmpPdf = Paths.get(pdfOutPath + ".tmp");
            try {
                imagesToPdf(imgDir, tmpPdf);
                Files.move(tmpPdf, pdfPath, StandardCopyOption.REPLACE_EXISTING);
                logger.info("OFD converted to PDF: {} -> {}", ofdPath, pdfOutPath);
            } finally {
                Files.deleteIfExists(tmpPdf);
            }
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("OFD to PDF conversion failed: " + ofdPath, e);
        } finally {
            deleteRecursively(imgDir);
        }
    }

    private void renderPages(Path ofd, Path imgDir) throws Exception {
        ClassLoader cl = ofdRuntimeClassLoader();
        ensureOfdFonts(cl);
        Class<?> readerClz = cl.loadClass("org.ofdrw.reader.OFDReader");
        Class<?> makerClz = cl.loadClass("org.ofdrw.converter.ImageMaker");

        Constructor<?> readerCtor = readerClz.getConstructor(Path.class);
        Constructor<?> makerCtor = makerClz.getConstructor(readerClz, double.class);
        Method pageSize = makerClz.getMethod("pageSize");
        Method makePage = makerClz.getMethod("makePage", int.class);
        Method close = readerClz.getMethod("close");

        Object reader = readerCtor.newInstance(ofd);
        try {
            Object maker = makerCtor.newInstance(reader, PPM);
            int pages = (Integer) pageSize.invoke(maker);
            if (pages <= 0) {
                throw new IOException("OFD has no pages: " + ofd);
            }
            for (int i = 0; i < pages; i++) {
                BufferedImage image = (BufferedImage) makePage.invoke(maker, i);
                Path png = imgDir.resolve(String.format("%04d.png", i));
                if (!ImageIO.write(image, "PNG", png.toFile())) {
                    throw new IOException("Failed to write PNG for page " + i);
                }
            }
        } finally {
            close.invoke(reader);
        }
    }

    /**
     * OFD often references Windows fonts (SimSun/SimHei). Linux images usually only
     * have WenQuanYi {@code .ttc}. {@code loadAsDefaultFont} cannot parse TTC bytes
     * directly, so we load via {@code loadExternalFont} and wire aliases/system maps.
     */
    private static void ensureOfdFonts(ClassLoader cl) throws Exception {
        if (ofdFontsConfigured) {
            return;
        }
        synchronized (LOCK) {
            if (ofdFontsConfigured) {
                return;
            }
            Class<?> fontLoaderClz = cl.loadClass("org.ofdrw.converter.FontLoader");
            fontLoaderClz.getMethod("setSimilarFontReplace", boolean.class).invoke(null, true);
            Object loader = fontLoaderClz.getMethod("getInstance").invoke(null);

            Method scanDir = fontLoaderClz.getMethod("scanFontDir", Path.class);
            for (String dir : List.of(
                    "/usr/share/fonts/truetype/wqy",
                    "/usr/share/fonts/chinese",
                    "/usr/share/fonts",
                    "/usr/local/share/fonts",
                    "C:\\Windows\\Fonts")) {
                Path p = Paths.get(dir);
                if (Files.isDirectory(p)) {
                    scanDir.invoke(loader, p);
                }
            }

            Path cjkFont = null;
            for (String fontPath : List.of(
                    // prefer single-face TTF/OTF
                    "C:\\Windows\\Fonts\\simhei.ttf",
                    "C:\\Windows\\Fonts\\simsunb.ttf",
                    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
                    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
                    "C:\\Windows\\Fonts\\msyh.ttc",
                    "C:\\Windows\\Fonts\\simsun.ttc")) {
                Path p = Paths.get(fontPath);
                if (Files.isRegularFile(p)) {
                    cjkFont = p;
                    break;
                }
            }
            if (cjkFont == null) {
                logger.warn("No CJK font found for OFD rendering; Chinese glyphs may become tofu boxes");
                ofdFontsConfigured = true;
                return;
            }

            String fontPath = cjkFont.toAbsolutePath().toString();
            boolean defaultOk = false;
            String lower = fontPath.toLowerCase();
            if (lower.endsWith(".ttf") || lower.endsWith(".otf")) {
                defaultOk = (Boolean) fontLoaderClz.getMethod("loadAsDefaultFont", String.class)
                        .invoke(null, fontPath);
            }
            if (!defaultOk) {
                // TTC (and failed TTF): load via collection-aware API, then set static defaultFont
                Object ttf = fontLoaderClz
                        .getMethod("loadExternalFont", String.class, String.class, String.class)
                        .invoke(loader, fontPath, null, null);
                if (ttf != null) {
                    var defaultFontField = fontLoaderClz.getDeclaredField("defaultFont");
                    defaultFontField.setAccessible(true);
                    defaultFontField.set(null, ttf);
                    var defaultPathField = fontLoaderClz.getDeclaredField("DefaultFontPath");
                    defaultPathField.setAccessible(true);
                    defaultPathField.set(null, cjkFont);
                    defaultOk = true;
                }
            }
            logger.info("OFD default font {}: {}", cjkFont, defaultOk);

            Class<?> envFontClz = cl.loadClass("org.ofdrw.font.EnvFont");
            try {
                envFontClz.getMethod("setDefaultFont", Path.class).invoke(null, cjkFont);
            } catch (Exception e) {
                logger.warn("EnvFont.setDefaultFont failed for {}: {}", cjkFont, e.toString());
            }
            try {
                envFontClz.getMethod("load", Path.class).invoke(null, cjkFont.getParent());
            } catch (Exception e) {
                logger.warn("EnvFont.load failed for {}: {}", cjkFont.getParent(), e.toString());
            }

            Method addSystemPath = fontLoaderClz.getMethod("addSystemFontMapping", String.class, String.class);
            Method addAlias = fontLoaderClz.getMethod("addAliasMapping", String.class, String.class);
            Method addSimilar = fontLoaderClz.getMethod(
                    "addSimilarFontReplaceRegexMapping", String.class, String.class);

            // After scanFontDir, WQY English family name is typically registered.
            String aliasTarget = "WenQuanYi Micro Hei";
            String fileName = cjkFont.getFileName().toString().toLowerCase();
            if (fileName.contains("zenhei")) {
                aliasTarget = "WenQuanYi Zen Hei";
            } else if (fileName.contains("simhei")) {
                aliasTarget = "SimHei";
            } else if (fileName.contains("simsun")) {
                aliasTarget = "SimSun";
            } else if (fileName.contains("msyh")) {
                aliasTarget = "Microsoft YaHei";
            }

            for (String name : List.of(
                    "SimSun", "SimHei", "NSimSun", "FangSong", "KaiTi", "Microsoft YaHei", "MSYahei",
                    "宋体", "黑体", "新宋体", "仿宋", "楷体", "微软雅黑", "华文宋体", "华文黑体",
                    "文泉驿微米黑", "文泉驿正黑", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei")) {
                addSystemPath.invoke(loader, name, fontPath);
                addAlias.invoke(loader, name, aliasTarget);
            }
            for (String regex : List.of(
                    ".*SimSun.*", ".*SimHei.*", ".*Song.*", ".*Hei.*", ".*YaHei.*", ".*Yahei.*",
                    ".*宋.*", ".*黑.*", ".*仿宋.*", ".*楷.*", ".*WenQuanYi.*", ".*文泉.*")) {
                addSimilar.invoke(loader, regex, aliasTarget);
                // also map regex directly to file path via system mapping of the alias target
            }
            addSystemPath.invoke(loader, aliasTarget, fontPath);

            ofdFontsConfigured = true;
        }
    }

    private static void imagesToPdf(Path imgDir, Path pdfPath) throws IOException {
        List<Path> pngs;
        try (Stream<Path> walk = Files.list(imgDir)) {
            pngs = walk.filter(p -> p.getFileName().toString().endsWith(".png"))
                    .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .toList();
        }
        if (pngs.isEmpty()) {
            throw new IOException("No page images to stitch: " + imgDir);
        }

        try (PDDocument doc = new PDDocument()) {
            for (Path png : pngs) {
                BufferedImage image = ImageIO.read(png.toFile());
                if (image == null) {
                    throw new IOException("Cannot read page image: " + png);
                }
                float width = image.getWidth();
                float height = image.getHeight();
                PDPage page = new PDPage(new PDRectangle(width, height));
                doc.addPage(page);
                PDImageXObject pdImage = LosslessFactory.createFromImage(doc, image);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.drawImage(pdImage, 0, 0, width, height);
                }
            }
            doc.save(pdfPath.toFile());
        }
    }

    private static ClassLoader ofdRuntimeClassLoader() throws IOException {
        if (ofdClassLoader != null) {
            return ofdClassLoader;
        }
        synchronized (LOCK) {
            if (ofdClassLoader != null) {
                return ofdClassLoader;
            }
            // Fat-jar nests ofd-runtime/*.jar under BOOT-INF/classes; URLClassLoader cannot
            // load nested jars in-place, so extract to a temp dir first.
            PathMatchingResourcePatternResolver resolver =
                    new PathMatchingResourcePatternResolver(OfdToImageService.class.getClassLoader());
            Resource[] resources = resolver.getResources("classpath*:ofd-runtime/*.jar");
            if (resources.length == 0) {
                throw new IOException("ofd-runtime/*.jar not found on classpath; run maven generate-resources first");
            }
            Path extractDir = Paths.get(System.getProperty("java.io.tmpdir"), "kkfileview-ofd-runtime");
            Files.createDirectories(extractDir);
            List<URL> jars = new ArrayList<>();
            for (Resource resource : resources) {
                String name = resource.getFilename();
                if (name == null || !name.endsWith(".jar")) {
                    continue;
                }
                Path dest = extractDir.resolve(name);
                try (InputStream in = resource.getInputStream()) {
                    Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
                }
                jars.add(dest.toUri().toURL());
            }
            if (jars.isEmpty()) {
                throw new IOException("No jars extracted from ofd-runtime/");
            }
            jars.sort(Comparator.comparing(URL::toString));
            ofdClassLoader = new ChildFirstUrlClassLoader(
                    jars.toArray(URL[]::new),
                    OfdToImageService.class.getClassLoader());
            logger.info("Loaded isolated OFD runtime with {} jars from {}", jars.size(), extractDir);
            return ofdClassLoader;
        }
    }

    static final class ChildFirstUrlClassLoader extends URLClassLoader {
        ChildFirstUrlClassLoader(URL[] urls, ClassLoader parent) {
            super(urls, parent);
        }

        @Override
        protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
            synchronized (getClassLoadingLock(name)) {
                Class<?> c = findLoadedClass(name);
                if (c == null) {
                    if (!name.startsWith("java.") && !name.startsWith("jdk.") && !name.startsWith("sun.")) {
                        try {
                            c = findClass(name);
                        } catch (ClassNotFoundException ignored) {
                            // fall through to parent
                        }
                    }
                }
                if (c == null) {
                    c = getParent().loadClass(name);
                }
                if (resolve) {
                    resolveClass(c);
                }
                return c;
            }
        }
    }

    private static void deleteRecursively(Path root) throws IOException {
        if (!Files.exists(root)) {
            return;
        }
        try (var walk = Files.walk(root)) {
            walk.sorted((a, b) -> b.compareTo(a)).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // best-effort cleanup
                }
            });
        }
    }
}
