import Foundation

extension DateFormatter {
    static let iso8601Formatter: DateFormatter = {
        $0.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
        return $0
    }(DateFormatter())

    static let ddMMMMyyyy: DateFormatter = {
        $0.dateFormat = "dd MMMM yyyy"
        return $0
    }(DateFormatter())

    static let dMMMMyyyy: DateFormatter = {
        $0.dateFormat = "d MMMM yyyy"
        return $0
    }(DateFormatter())

    static let MMMMyyyy: DateFormatter = {
        $0.dateFormat = "MMMM yyyy"
        return $0
    }(DateFormatter())

    static let ddMMM: DateFormatter = {
        $0.dateFormat = "dd MMMM"
        return $0
    }(DateFormatter())

    static let dMyy: DateFormatter = {
        $0.dateFormat = "d/M/yy"
        return $0
    }(DateFormatter())

    static let yyMd: DateFormatter = {
        $0.dateFormat = "yy/M/d"
        return $0
    }(DateFormatter())

    static let HHmm: DateFormatter = {
        $0.dateFormat = "HH:mm"
        return $0
    }(DateFormatter())
}
