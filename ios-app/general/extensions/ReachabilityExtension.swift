import Foundation

extension Reachability {
    class var isOnline: Bool {
        return Reachability().flatMap { $0.connection != .none } ?? true
    }
}
