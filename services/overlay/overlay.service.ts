import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BaseOverlayContentData, OverlayWithData } from 'app/components/common/overlay-content/types';
import { EnvironmentUtils } from 'app/utils/device-utils';

@Injectable({
    providedIn: 'root',
})
export class OverlayService {
    protected readonly dialogService = inject(MatDialog);
    protected readonly bottomSheetService = inject(MatBottomSheet);

    isOverlayWithData(obj: unknown): obj is OverlayWithData {
        return 'data' in (obj as object);
    }

    get hasActiveOverlay() {
        return this.dialogService.openDialogs.length > 0 || !!this.bottomSheetService._openedBottomSheetRef?.instance;
    }

    openOverlay<T>(componentType: ComponentType<T>, data?: BaseOverlayContentData, afterClosed?: () => void, forceClose = false) {
        let contentComponent: T;
        let dialogRef: MatDialogRef<T>;
        let bottomSheetRef: MatBottomSheetRef<T>;

        if (forceClose && this.hasActiveOverlay) {
            this.closeAll();
        }

        if (EnvironmentUtils.isDesktop()) {
            dialogRef = this.dialogService.open(componentType);
            contentComponent = dialogRef.componentInstance;
            if (this.isOverlayWithData(contentComponent) && data) {
                contentComponent.data.set(data);
            }

            dialogRef.backdropClick().subscribe(() => data?.doOnClose?.());

            dialogRef.afterClosed().subscribe((result?: () => void) => {
                result?.();
                afterClosed?.();
            });
        } else {
            bottomSheetRef = this.bottomSheetService.open(componentType, {
                panelClass: `${data?.fullScreen ? 'full-screen-' : ''}bottom-sheet-panel`,
            });
            contentComponent = bottomSheetRef.instance;
            if (this.isOverlayWithData(contentComponent) && data) {
                contentComponent.data.set(data);
            }

            bottomSheetRef.backdropClick().subscribe(() => data?.doOnClose?.());

            bottomSheetRef.afterDismissed().subscribe((result?: () => void) => {
                result?.();
                afterClosed?.();
            });
        }
        return contentComponent;
    }

    closeAll(afterClosed?: () => void) {
        if (this.hasActiveOverlay) {
            if (this.dialogService.openDialogs.length > 0) {
                this.dialogService.openDialogs[0].afterClosed().subscribe(() => {
                    afterClosed?.();
                });
                this.dialogService.closeAll();
            }

            this.bottomSheetService.dismiss(() => afterClosed?.());
        } else {
            afterClosed?.();
        }
    }
}
