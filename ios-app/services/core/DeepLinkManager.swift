import Foundation

enum DeepLinkType: String {
    case main
    case profile
    case accountSettings = "accountSettings"
    case resetPassword = "password"
    case chat
}

enum QueryItemName: String {
    case countryCode
}

class DeepLinkManager: RemoteActivityHandlerInjected, ServerServiceInjected, AuthServiceInjected {
    var deepLinkRegExps = [DeepLinkType: [NSRegularExpression]]()
    var pendingURL: URL?

    func reloadRegExps(completion: @escaping () -> Void) {
        serverManager.getDeepLinkRegExps { response in
            if case .success(let deepLinkRegExps) = response {
                self.deepLinkRegExps = deepLinkRegExps
                if let url = self.pendingURL {
                    _ = self.handleUrl(url)
                    self.pendingURL = nil
                }
            }
            completion()
        }
    }

    func handleUrl(_ url: URL) -> Bool {
        if deepLinkRegExps.isEmpty {
            pendingURL = url
            return true
        }

        if let deepLinkType = type(urlString: url.absoluteString) {
            let queryItems = URLComponents(string: url.absoluteString)?.queryItems

            let tempToken = queryItems?.first(where: { $0.name == "tempToken" })?.value
            var country: Country?
            if let payload = try? tempToken?.getJWTPayload(),
               let data = payload["data"] as? [String: Any],
               let brandCode = data["brandCode"] as? String,
               let countryParsed = Country(rawValue: brandCode) {
                country = countryParsed
            }

            if let tempToken, let country, !authService.isLoggedIn {
                print("tempToken=\(tempToken)")
                authService.signIn(type: .tempToken(token: tempToken, country: country)) {
                    if case .success = $0 {
                        Router.moveToSignInState()
                        if deepLinkType != .main {
                            _ = self.handleUrl(url)
                        }
                    }
                }
                return true
            }

            if deepLinkType != .resetPassword {
                // for this types we should handle deep links only for current country
                if let country, country.rawValue != UserDefaults.countryCode {
                    return false
                }
            }

            let action: RemoteActivityType
            switch deepLinkType {
            case .main:
                action = .main
            case .profile:
                let report = queryItems?.first(where: { $0.name == "reportQR" })?.value == "1"
                action = .profile(userId: url.lastPathComponent, action: report ? .report : nil)
            case .accountSettings:
                action = .applicationSettings
            case .resetPassword:
                let countryCode = url.firstQueryItem(.countryCode) ?? ""
                action = .resetPassword(token: url.lastPathComponent, countryCode: countryCode)
            case .chat:
                action = .chat(userId: url.lastPathComponent)
            }
            return remoteActivityHandler.handleAction(action)
        }
        return false
    }

    private func type(urlString: String) -> DeepLinkType? {
        let urlRange = NSRange(urlString.startIndex..., in: urlString)
        for (type, linkRegExps) in deepLinkRegExps where linkRegExps.contains(where: { $0.firstMatch(in: urlString, range: urlRange) != nil }) {
            return type
        }
        return nil
    }
}
