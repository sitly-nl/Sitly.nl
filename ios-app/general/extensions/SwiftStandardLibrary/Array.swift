import Foundation

extension Array where Element == String {
    func aggregatedDescription(terminatingConnector: String = " & ") -> String {
        var res = ""
        enumerated().forEach {
            if $0.0 == (count - 1) {
                res.append($0.1)
            } else if $0.0 == (count - 2) {
                res.append($0.1 + terminatingConnector)
            } else {
                res.append($0.1 + ", ")
            }
        }
        return res
    }
}

extension Array where Element == [String: Any] {
    func nonFatalInfo() -> String {
        var payloads = [String]()
        for item in self.enumerated() {
            payloads.append("\"payload\(item.offset)\":\(item.element.nonFatalInfo())")
        }
        return "{\(payloads.joined(separator: ","))}"
    }
}
