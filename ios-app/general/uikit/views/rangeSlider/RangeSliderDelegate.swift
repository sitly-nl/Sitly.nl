import Foundation

protocol RangeSliderDelegate: AnyObject {
    func didSlideMin(value: Int)
    func didSlideMax(value: Int)
}
