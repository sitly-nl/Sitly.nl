import Foundation

class HelpPresenter: BasePresenter {
    let configService: ConfigServiceable
    weak var view: HelpView?

    init(view: HelpView, configService: ConfigServiceable) {
        self.configService = configService
        self.view = view
        super.init(baseView: view)
    }
}

// MARK: - HelpPresenterProtocol
extension HelpPresenter: HelpPresenterProtocol {
    func getContactUrl() {
        if let config = configService.fetch() {
            var systemInfo = utsname()
            uname(&systemInfo)
            let machineMirror = Mirror(reflecting: systemInfo.machine)
            let identifier = machineMirror.children.reduce("") { identifier, element in
                guard let value = element.value as? Int8, value != 0 else { return identifier }
                return identifier + String(UnicodeScalar(UInt8(value)))
            }

            var urlComps = URLComponents(string: config.contactUrl)
            urlComps?.queryItems = [
                URLQueryItem(name: "app_version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""),
                URLQueryItem(name: "device_model", value: identifier)
            ]
            view?.contactUrl = urlComps?.url
        }
    }
}
