import { config } from './../../config/config';
import * as moment from 'moment';
import { createWriteStream } from 'fs';
import { BrandCode } from '../models/brand-code';
import { PaymentType } from '../models/payment-types';
import * as PDFDocument from 'pdfkit';
import { getModels } from '../sequelize-connections';
import { TranslationsService } from './translations.service';
import { LocaleId } from '../models/locale.model';

process.on('message', (msg: GenerateInvoicePdfInput) => {
    const pdfBuilder = new PdfBuilder();
    pdfBuilder
        .renderPDF(msg)
        .then(res => {
            const timestamp = new Date().getTime();
            const fileName = `invoice-${timestamp}.pdf`;
            const pdfFile = createWriteStream(fileName);
            res.pipe(pdfFile).on('finish', () => {
                process.send?.(fileName);
            });
        })
        .catch(_ => {
            process.send?.('');
        });
});

export interface GenerateInvoicePdfInput {
    userId: number;
    paymentId: number;
    localeId: LocaleId;
    brandCode: BrandCode;
}

export class PdfBuilder {
    private doc;
    private columnGap = 20;
    private columWidth;
    private xOriginal;

    constructor() {
        this.doc = new PDFDocument({
            size: 'A4',
        });
        this.doc.registerFont('opensans.regular', './resources/fonts/OpenSans-Regular.ttf');
        this.doc.registerFont('opensans.bold', './resources/fonts/OpenSans-Bold.ttf');
        this.doc.registerFont('opensans.light', './resources/fonts/OpenSans-Light.ttf');

        this.columWidth = (this.doc.page.width - this.columnGap - 2 * this.doc.x) / 2;
        this.xOriginal = this.doc.x;
    }

    async renderPDF(input: GenerateInvoicePdfInput) {
        const models = getModels(input.brandCode);

        const user = await models.User.byId(input.userId, undefined, ['place']);
        if (!user) {
            throw new Error("Can't find user");
        }

        const payment = await models.Payment.findByPk(input.paymentId, {
            include: { association: 'subscription', required: true },
        });
        if (!payment) {
            throw new Error("Can't find appropriate payment");
        }

        const subscription = payment.subscription;

        const translator = await TranslationsService.translator({
            localeId: input.localeId,
            groupName: 'api',
            prefix: ['country.', 'invoice.'],
        });

        this.doc.image('./resources/images/logo-invoice.png', { scale: 0.5 });

        this.doc.font('opensans.bold').fontSize(32).fillColor('#22313e').text(translator.translated('invoice.title'), this.xOriginal, 100);

        let y = this.doc.y + 20;

        // header section
        this.doc.font('opensans.regular').fontSize(17).text(`${user.first_name} ${user.last_name}`, this.xOriginal, y);

        this.doc.moveDown(0.5);
        y = this.doc.y;

        this.doc.fontSize(12).font('opensans.light').fillColor('#8C8C8C');
        const customUser = user.customUser;
        this.doc.text(
            `${customUser.address} ${customUser.housenumber}\n${customUser.place?.place_name}\n${translator.translated(
                `country.${input.brandCode}`,
            )}`,
            { width: this.columWidth },
        );

        const locale = await models.Locale.byId(input.localeId);
        const localeCode = locale?.locale_code;
        const created = moment(payment.created);
        created.locale(localeCode ?? 'en');
        const dateFormat = 'DD MMMM YYYY';
        const dateValue = created.format(dateFormat);
        this.doc.text(
            `${translator.translated('invoice.clientNumber')}: ${user.webuser_id}\n${translator.translated('invoice.receiptReference')}: ${
                payment.instance_id
            }\n${translator.translated('invoice.date')}: ${dateValue}`,
            this.xOriginal + this.columWidth + this.columnGap,
            y,
            {
                width: this.columWidth,
                align: 'right',
            },
        );

        this.doc.moveDown(5);

        const sectionsStartY = this.doc.y;

        // info section
        this.doc
            .moveTo(this.xOriginal, this.doc.y)
            .lineTo(this.doc.page.width - this.xOriginal, this.doc.y)
            .fillAndStroke('#DFE5E9');
        this.doc.moveDown(0.5);

        let description: string;
        if (payment.order_type === PaymentType.recurring && payment.created) {
            description = translator.translated('invoice.premium1Month');
        } else {
            description = translator.translated('invoice.premiumXMonths', { '[months]': `${subscription.duration}` }, false);
        }
        this.drawTextLine(translator.translated('invoice.description') + ':', description);

        const duration =
            payment.order_type === PaymentType.recurring && created.isBefore(moment('2021-03-15T12:00:00Z')) ? 1 : subscription.duration;
        this.drawTextLine(
            translator.translated('invoice.period') + ':',
            dateValue + ' - ' + created.add(duration, 'month').format(dateFormat),
        );

        this.doc.moveDown(0.5);
        this.doc
            .moveTo(this.xOriginal, this.doc.y)
            .lineTo(this.doc.page.width - this.xOriginal, this.doc.y)
            .stroke();
        this.doc.moveDown(0.5);

        const brandConfigSettings = config.getConfig(input.brandCode);
        const vatPercentage = brandConfigSettings.vatRate;
        const amountTotal = payment.amount;
        const amountExcludingVat = amountTotal / (1 + vatPercentage / 100);
        const vat = amountTotal - amountExcludingVat;
        const moneyFormat = brandConfigSettings.moneyFormat;

        this.drawTextLine(
            translator.translated('invoice.amountExclVat') + ':',
            moneyFormat.replace('[amount]', amountExcludingVat.toFixed(2)),
        );

        this.drawTextLine(
            translator.translated('invoice.vatPercentage', { '[percentage]': `${vatPercentage}` }, false) + ':',
            moneyFormat.replace('[amount]', vat.toFixed(2)),
        );

        this.doc.moveDown(0.5);
        this.doc
            .moveTo(this.xOriginal, this.doc.y)
            .lineTo(this.doc.page.width - this.xOriginal, this.doc.y)
            .stroke();
        this.doc.moveDown(0.5);

        this.drawTextLine(translator.translated('invoice.total') + ':', moneyFormat.replace('[amount]', amountTotal.toFixed(2)));

        this.doc.moveDown(0.5);
        this.doc
            .moveTo(this.xOriginal, this.doc.y)
            .lineTo(this.doc.page.width - this.xOriginal, this.doc.y)
            .stroke();
        this.doc.moveDown(1.5);

        y = this.doc.y;
        this.doc.image('./resources/images/invoice-thanks.png', this.xOriginal, y, { scale: 0.5 });
        this.doc
            .font('opensans.regular')
            .fontSize(14)
            .fillColor('black')
            .text(translator.translated('invoice.thanks') + ' ', this.xOriginal + 30, y, { continued: true })
            .font('opensans.light')
            .fontSize(13)
            .fillColor('#8c8c8c')
            .text(translator.translated('invoice.paymentReceived'));

        const verticalSpacing = 40;
        this.doc
            .rect(0, sectionsStartY - verticalSpacing, this.doc.page.width, this.doc.y - sectionsStartY + 2 * verticalSpacing)
            .fillColor('#419BCD', 0.1)
            .fill()
            .opacity(1);

        this.doc.moveDown(5);

        // bottom section
        y = this.doc.y;
        this.doc.font('opensans.regular').fontSize(12).fillColor('black').text('Sitly', this.xOriginal, y, { width: this.columWidth });
        this.doc.font('opensans.light').fontSize(11).fillColor('#8c8c8c');
        this.doc.text('Keizersgracht 229, 1016 DV, Amsterdam, Nederland', { width: this.columWidth });
        this.doc.text(translator.translated('invoice.email') + ': ' + brandConfigSettings.contactEmail, { width: this.columWidth });
        this.doc.text(translator.translated('invoice.chamberOfCommerceNumber') + ': 56028458', { width: this.columWidth });
        this.doc.text(translator.translated('invoice.vatNumber') + ': NL851948844B01', { width: this.columWidth });
        this.doc
            .font('opensans.regular')
            .fontSize(12)
            .fillColor('black')
            .text(translator.translated('invoice.premiumHeader'), this.xOriginal + this.columWidth + this.columnGap, y, {
                width: this.columWidth,
            });

        this.doc
            .font('opensans.light')
            .fontSize(11)
            .fillColor('#8c8c8c')
            .text(
                translator.translated(
                    'invoice.premiumDescription',
                    {
                        '[currencyCode]': brandConfigSettings.currencyCode,
                        '[amount]': subscription.price_per_unit.toFixed(2),
                    },
                    false,
                ),
                this.xOriginal + this.columWidth + this.columnGap,
                this.doc.y,
                {
                    width: this.columWidth,
                },
            );

        this.doc.end();

        return this.doc;
    }

    private drawTextLine(str1: string, str2: string) {
        const y = this.doc.y;
        this.doc.fontSize(13).font('opensans.light').fillColor('black').text(str1, this.xOriginal, y, { width: this.columWidth });
        this.doc.fillColor('#8c8c8c').text(str2, this.xOriginal + this.columWidth + this.columnGap, y, {
            width: this.columWidth,
            align: 'right',
        });
    }
}
