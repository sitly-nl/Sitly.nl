import UIKit
import StoreKit

class PurchasesStringFormatter {
    class func priceString(product: SKProduct) -> String {
        let numberFormatter = PurchasesStringFormatter.numberFormatter(product: product)
        return numberFormatter.string(from: product.price) ?? ""
    }

    class func formattedSubscriptionExplanation(product: SKProduct, textColor: UIColor) -> NSAttributedString {
        let attributedString = NSMutableAttributedString()

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center

        let mainAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: textColor,
            .font: UIFont.openSans(size: 10),
            .paragraphStyle: paragraphStyle
        ]

        attributedString.append(
            string: "subscriptionExplanation.title".localized + "\n",
            attributes: [
                .foregroundColor: textColor,
                .font: UIFont.openSansSemiBold(size: 11),
                .paragraphStyle: paragraphStyle
            ])
        let priceString = PurchasesStringFormatter.numberFormatter(product: product).string(from: product.price) ?? "-"
        attributedString.append(
            string: String(format: "subscriptionExplanation.text".localized + " ", priceString, priceString),
            attributes: mainAttributes)

        guard
            let termsUrl = URL(string: Link.terms),
            let policyUrl = URL(string: Link.policy)
        else {
            return attributedString
        }
        attributedString.append(
            string: String(format: "termsOfService".localized),
            attributes: [
                .foregroundColor: textColor,
                .font: UIFont.openSansBold(size: 10),
                .paragraphStyle: paragraphStyle,
                .link: termsUrl,
                .underlineStyle: NSUnderlineStyle.single.rawValue
            ])
        attributedString.append(
            string: String(format: " " + "and".localized + " ", priceString, priceString),
            attributes: mainAttributes)
        attributedString.append(
            string: String(format: "privacyStatement".localized),
            attributes: [
                .foregroundColor: textColor,
                .font: UIFont.openSansBold(size: 10),
                .paragraphStyle: paragraphStyle,
                .link: policyUrl,
                .underlineStyle: NSUnderlineStyle.single.rawValue
            ])

        return attributedString
    }

    private class func numberFormatter(product: SKProduct) -> NumberFormatter {
        let numberFormatter = NumberFormatter()
        numberFormatter.formatterBehavior = .behavior10_4
        numberFormatter.numberStyle = .currency
        numberFormatter.locale = product.priceLocale
        return numberFormatter
    }
}
