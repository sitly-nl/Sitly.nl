import { Observable } from 'rxjs';

export class ImageLoaderService {
    loadPhoto(event: Event, maxSize: number) {
        const el = event.target as HTMLInputElement;
        const file = el.files?.[0];
        if (!file) {
            return;
        }

        return new Observable<{ imgData?: string }>(observer => {
            const reader = new FileReader();
            reader.addEventListener('loadend', _ => {
                const base64img = reader.result as string;

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const originalImage = new Image();
                originalImage.src = base64img;

                originalImage.onload = () => {
                    const originalWidth = originalImage.width;
                    const originalHeight = originalImage.height;

                    if (originalWidth > maxSize || originalHeight > maxSize) {
                        let newWidth = maxSize;
                        let newHeight = maxSize;
                        if (originalWidth > originalHeight) {
                            newHeight = (maxSize / originalWidth) * originalHeight;
                        } else if (originalHeight > originalWidth) {
                            newWidth = (maxSize / originalHeight) * originalWidth;
                        }
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        ctx?.drawImage(originalImage, 0, 0, newWidth, newHeight);
                    } else {
                        canvas.width = originalWidth;
                        canvas.height = originalHeight;
                        ctx?.drawImage(originalImage, 0, 0, originalWidth, originalHeight);
                    }

                    // emit image data
                    observer.next({
                        imgData: ctx?.canvas?.toDataURL('image/jpeg', 100),
                    });
                    observer.complete();
                };
            });

            reader.readAsDataURL(file);
        });
    }
}
