import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';
import { AppRoutingModule } from 'app/app-routing.module';
import { DeveloperMenuService } from 'app/services/developer-menu.service';

@NgModule({
    imports: [CommonModule, SharedModule, AppRoutingModule],
    providers: [DeveloperMenuService],
})
export default class AppModule {}
