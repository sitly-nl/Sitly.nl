import UIKit

extension String {
    /// Compares a string, case insenstive.
    ///
    /// - Parameter string: The string to compare with.
    /// - Returns: A boolean, if the string is equal it is true.
    func equalsIgnoreCase(_ string: String) -> Bool {
        return self.lowercased() == string.lowercased()
    }

    /// Transforms a string to localized version, if available.
    var localized: String {
        return NSLocalizedString(self, comment: "")
    }

    /// Validates if the string is a valid email address.
    ///
    /// - Returns: A boolean, if the string is a valid email address.
    func isValidEmail() -> Bool {
        let regex = try? NSRegularExpression(pattern: "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}", options: .caseInsensitive)
        return regex?.firstMatch(in: self, options: [], range: NSRange(location: 0, length: self.count)) != nil
    }

    /// Determines the width of a text based on the font.
    ///
    /// - Parameter font: The font used for the text.
    /// - Returns: The width of the text.
    func width(font: UIFont) -> CGFloat {
        return sizeWith(font: font).width
    }

    /// Determines the sizes of a text.
    ///
    /// - Parameters:
    ///   - width: The maximum width of the text.
    ///   - height: The maximum height of the text.
    ///   - font: The font used for the text.
    ///   - lineBreakMode: The linebreak mode that is used.
    ///   - lineSpacing: The linespacing.
    /// - Returns: The size of the text.
    func sizeWith(
        width: CGFloat = .greatestFiniteMagnitude,
        height: CGFloat = .greatestFiniteMagnitude,
        font: UIFont,
        lineBreakMode: NSLineBreakMode = .byWordWrapping,
        lineSpacing: CGFloat = 2
    ) -> CGSize {
        let constraintSize = CGSize(width: width, height: height)

        guard let paragraph = NSParagraphStyle.default.mutableCopy() as? NSMutableParagraphStyle else {
            return .zero
        }

        paragraph.lineBreakMode = lineBreakMode
        paragraph.lineSpacing = lineSpacing

        return self.boundingRect(
            with: constraintSize,
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: [.font: font, .paragraphStyle: paragraph],
            context: nil
        ).size
    }

    /// Converts a Swift Range to NSRange
    ///
    /// - Parameter range: The range to convert.
    /// - Returns: a NSRange.
    func nsRange(from range: Range<Index>) -> NSRange {
        let lower = UTF16View.Index(range.lowerBound, within: utf16)
        let upper = UTF16View.Index(range.upperBound, within: utf16)
        return NSRange(location: utf16.distance(from: utf16.startIndex, to: lower!), length: utf16.distance(from: lower!, to: upper!))
    }

    /// Capitalizes the first letter of the string.
    ///
    /// - Returns: The capitalized string.
    func capitalizingFirstLetter() -> String {
        let first = String(prefix(1)).capitalized
        let other = String(dropFirst())
        return first + other
    }

    func lowercasingFirstLetter() -> String {
        let first = String(prefix(1)).lowercased()
        let other = String(dropFirst())
        return first + other
    }

    /// Tries to match the pattern.
    ///
    /// - Parameter pattern: The regex pattern to match.
    /// - Returns: The matches.
    func matches(withRegex pattern: String) -> [String] {
        do {
            let regex = try NSRegularExpression(pattern: pattern)
            let results = regex.matches(in: self, range: NSRange(location: 0, length: self.count))
            return results.map { (self as NSString).substring(with: $0.range) }
        } catch let error {
            print("invalid regex: \(error.localizedDescription)")
            return []
        }
    }

    /// Transforms the text to parse emoji that are available through the old custom way of unicode storage.
    var includingEmoji: String {
        let results = self.matches(withRegex: "\\[unicode_(.*?)\\]")
        var text = self

        results.forEach { result in
            let arr = result
                .replacingOccurrences(of: "[", with: "")
                .replacingOccurrences(of: "]", with: "")
                .components(separatedBy: "_")
                .compactMap { UTF16.CodeUnit($0) }
            text = text.replacingOccurrences(of: result, with: String(utf16CodeUnits: arr, count: arr.count))
        }

        return text
    }

    func getJWTPayload() throws -> [String: Any] {
        enum DecodeErrors: Error {
            case badToken
            case other
        }

        func base64Decode(_ base64: String) throws -> Data {
            let base64 = base64
                .replacingOccurrences(of: "-", with: "+")
                .replacingOccurrences(of: "_", with: "/")
            let padded = base64.padding(toLength: ((base64.count + 3) / 4) * 4, withPad: "=", startingAt: 0)
            guard let decoded = Data(base64Encoded: padded) else {
                throw DecodeErrors.badToken
            }
            return decoded
        }

        func decodeJWTPart(_ value: String) throws -> [String: Any] {
            let bodyData = try base64Decode(value)
            let json = try JSONSerialization.jsonObject(with: bodyData, options: [])
            guard let payload = json as? [String: Any] else {
                throw DecodeErrors.other
            }
            return payload
        }

        let segments = self.components(separatedBy: ".")
        if segments.count < 2 {
            throw DecodeErrors.badToken
        }
        return try decodeJWTPart(segments[1])
    }

    func trim() -> String {
        return self.trimmingCharacters(in: CharacterSet.whitespaces)
    }
}
