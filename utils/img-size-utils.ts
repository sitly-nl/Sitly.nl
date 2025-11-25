export class ImgSizeUtil {
    private static readonly sizePlaceholder = '[size]';

    static transform(value: string, sizeValue: string | number, hdpi = false) {
        if (!value?.includes(ImgSizeUtil.sizePlaceholder)) {
            return value;
        }

        let size = Number(sizeValue);
        if (!Number.isNaN(size)) {
            size = Math.ceil(size / 100) * 100;

            if (hdpi) {
                let multiplier = 1;
                if (window?.devicePixelRatio >= 3) {
                    multiplier = 3;
                } else if (window?.devicePixelRatio >= 2) {
                    multiplier = 2;
                }
                size *= multiplier;
            }

            sizeValue = `${Math.min(Math.max(size, 100), 1300)}`;
        }

        return value.replace(ImgSizeUtil.sizePlaceholder, String(sizeValue));
    }
}
