package cn.keking.service.impl;

import cn.keking.config.ConfigConstants;
import cn.keking.model.FileAttribute;
import cn.keking.model.ReturnResponse;
import cn.keking.service.FileHandlerService;
import cn.keking.service.FilePreview;
import cn.keking.service.OfdToImageService;
import cn.keking.utils.DownloadUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.io.File;

/**
 * OFD preview keeps cnofd in the browser; {@code /convert} downloads a PDF
 * produced by rendering OFD pages to images then stitching ({@link OfdToImageService}).
 */
@Service
public class OfdFilePreviewImpl implements FilePreview {

    private static final Logger logger = LoggerFactory.getLogger(OfdFilePreviewImpl.class);

    private final CommonPreviewImpl commonPreview;
    private final OtherFilePreviewImpl otherFilePreview;
    private final FileHandlerService fileHandlerService;
    private final OfdToImageService ofdToImageService;

    public OfdFilePreviewImpl(CommonPreviewImpl commonPreview,
                              OtherFilePreviewImpl otherFilePreview,
                              FileHandlerService fileHandlerService,
                              OfdToImageService ofdToImageService) {
        this.commonPreview = commonPreview;
        this.otherFilePreview = otherFilePreview;
        this.fileHandlerService = fileHandlerService;
        this.ofdToImageService = ofdToImageService;
    }

    @Override
    public String filePreviewHandle(String url, Model model, FileAttribute fileAttribute) {
        commonPreview.filePreviewHandle(url, model, fileAttribute);

        String fileName = fileAttribute.getName();
        boolean forceUpdatedCache = fileAttribute.forceUpdatedCache();
        String outPdfPath = fileAttribute.getOutFilePath();
        String cacheKey = fileName + ".ofd.pdf";

        ReturnResponse<String> response = DownloadUtils.downLoad(fileAttribute, fileName);
        if (response.isFailure()) {
            return otherFilePreview.notSupportedFile(model, fileAttribute, response.getMsg());
        }

        File pdfFile = new File(outPdfPath);
        boolean needConvert = forceUpdatedCache
                || !pdfFile.exists()
                || !fileHandlerService.listConvertedFiles().containsKey(cacheKey)
                || !ConfigConstants.isCacheEnabled();

        if (needConvert) {
            try {
                ofdToImageService.ofdToPdf(response.getContent(), outPdfPath);
                if (ConfigConstants.isCacheEnabled()) {
                    fileHandlerService.addConvertedFile(cacheKey, fileHandlerService.getRelativePath(outPdfPath));
                }
            } catch (Exception e) {
                logger.error("OFD convert to PDF failed: {}", fileName, e);
                return otherFilePreview.notSupportedFile(model, fileAttribute, "OFD转换PDF失败: " + e.getMessage());
            }
        }

        fileAttribute.setOutFilePath(outPdfPath);
        return OFD_FILE_PREVIEW_PAGE;
    }
}
