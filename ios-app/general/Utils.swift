import UIKit

func debugLog<T>(_ value: T, functionName: String = #function) {
    if UIApplication.configuration == .debug {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        print("\(dateFormatter.string(from: Date())) \(value)")
    }
}

func serverImageSize(viewSize: CGFloat) -> Int {
    let size = Int(viewSize * UIScreen.main.scale) / 100 * 100
    return min(max(size, 100), 1300)
}

func < <T: RawRepresentable>(lhs: T, rhs: T) -> Bool where T.RawValue: Comparable {
    return lhs.rawValue < rhs.rawValue
}
