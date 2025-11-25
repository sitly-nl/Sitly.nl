import Foundation

extension Collection {
    /// Returns the element at the specified index if it is within bounds, otherwise nil.
    public subscript(safe index: Index) -> Element? {
        return index >= startIndex && index < endIndex ? self[index] : nil
    }

    var any: Bool {
        return self.count > 0
    }

    func firstOfType<T>(_ type: T.Type) -> T? {
        return first(where: { $0 is T }) as? T
    }
}
