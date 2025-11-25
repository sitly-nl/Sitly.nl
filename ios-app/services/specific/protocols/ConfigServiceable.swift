import Foundation

protocol ConfigServiceable {
    func getConfig(completion: @escaping ServerRequestCompletion<Configuration>)
    func fetch() -> Configuration?
    var forceHidePremium: Bool { get }
}
