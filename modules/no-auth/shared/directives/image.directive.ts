import { Directive, Input, ElementRef, inject } from '@angular/core';

@Directive({
    selector: '[image2x]',
})
export class ImageDirective {
    private element = inject<ElementRef<HTMLImageElement>>(ElementRef);

    private readonly folder = 'app/images/';
    private _extension = 'png';
    private _imageName: string;

    @Input() set image2x(imageName: string) {
        this._imageName = imageName;
        const src = `${this.folder}${this._imageName}.${this._extension}`;
        const src2x = `${this.folder}${this._imageName}@2x.${this._extension} 2x`;
        const src3x = `${this.folder}${this._imageName}@3x.${this._extension} 3x`;
        this.element.nativeElement.src = src;
        this.element.nativeElement.srcset = `${src2x}, ${src3x}`;

        // handle missing icon in 2x or 3x resolution
        this.element.nativeElement.onerror = () => {
            this.element.nativeElement.srcset = src2x;
            this.element.nativeElement.onerror = () => {
                this.element.nativeElement.srcset = src;
                this.element.nativeElement.onerror = () => {
                    console.log('image missed', imageName);
                };
            };
        };
    }

    @Input() set extension(value: string) {
        this._extension = value;
        if (this._imageName) {
            this.image2x = this._imageName;
        }
    }
}
