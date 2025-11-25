//
//  SafeProperty.swift
//  sitly
//
//  Created by Kyrylo Filippov on 18/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

@propertyWrapper
final class SafeProperty<T> {
    private let lock = Mutex()
    private var value: T

    // MARK: Lifecycle

    init(wrappedValue: T) {
        self.value = wrappedValue
    }

    // MARK: Properties

    var projectedValue: SafeProperty<T> { self }

    var wrappedValue: T {
        // swiftlint:disable:next implicit_getter
        get {
            self.lock.lock()
            defer { self.lock.unlock() }
            return self.value
        }
        _modify {
            self.lock.lock()
            defer { self.lock.unlock() }
            yield &self.value
        }
    }
}

// os_unfair_lock is used to support more older iOS versions < iOS 16
final class Mutex {
    private let lockPointer: os_unfair_lock_t

    init() {
        lockPointer = .allocate(capacity: 1)
        lockPointer.initialize(to: os_unfair_lock())
    }

    func lock() {
        os_unfair_lock_lock(lockPointer)
    }

    func unlock() {
        os_unfair_lock_unlock(lockPointer)
    }

    deinit {
        lockPointer.deinitialize(count: 1)
        lockPointer.deallocate()
    }

    static func make() -> Mutex {
        return Mutex()
    }
}
