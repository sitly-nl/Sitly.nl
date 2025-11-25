//
//  DIContainer.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

protocol DIContainerType: DIResolverType {
    func register<T>(type: T.Type, _ factory: @escaping (DIResolverType) -> T)
    func registerSingleton<T>(type: T.Type, _ factory: @escaping (DIResolverType) -> T)
    func registerFactory<FactoryType, FactoryImpl: BaseFactory>(
        _ factoryType: FactoryType.Type,
        _ factoryImplementation: FactoryImpl.Type
    )
}

protocol DIResolverType {
    func resolve<T>(_ type: T.Type) -> T
}

class DIContainer: DIContainerType {
    private var factories: [String: (isSingleton: Bool, builder: (DIResolverType) -> Any)] = [:]
    private var singletones: [String: Any] = [:]

    private static let lock = NSRecursiveLock()

    func register<T>(type: T.Type, _ factory: @escaping (DIResolverType) -> T) {
        // all dependencies registered synchronously on app start so there is no need in any
        // thread safety measures here
        factories[String(describing: type)] = (false, factory)
    }

    func registerSingleton<T>(type: T.Type, _ factory: @escaping (DIResolverType) -> T) {
        // all dependencies registered synchronously on app start so there is no need in any
        // thread safety measures here
        factories[String(describing: type)] = (true, factory)
    }

    func registerFactory<FactoryType, FactoryImpl: BaseFactory>(
        _ factoryType: FactoryType.Type,
        _ factoryImplementation: FactoryImpl.Type
    ) {
#if DEBUG
        // Check this only in debug builds to make sure all factories are registered correctly
        // and to not impact application start time in UAT and Production builds
        let factory = FactoryImpl.init(resolver: self)
        guard factory is FactoryType else {
            logError("Make sure \(type(of: factoryImplementation)) comforms to \(factoryType)!")
        }
#endif
        register(type: FactoryType.self) { r in
            let factory = FactoryImpl.init(resolver: r)
            guard let resolvedFactory = factory as? FactoryType else {
                // we have a check during debug so this should never happens for factories.
                self.logError(String(describing: factoryType))
            }
            return resolvedFactory
        }
    }

    func resolve<T>(_ type: T.Type) -> T {
        let objectName = String(describing: type)
        let objectFactory = sync { factories[objectName] }
        guard let objectFactory = objectFactory else {
            logError(objectName)
        }

        if objectFactory.isSingleton {
            return resolveSingleton(type.self, builder: objectFactory.builder)
        }

        guard let service = objectFactory.builder(self) as? T else {
            logError(objectName)
        }
        return service
    }

    private func resolveSingleton<T>(_ type: T.Type, builder: (DIResolverType) -> Any) -> T {
        let objectName = String(describing: type)
        let cachedService = sync { singletones[objectName] }

        if let cachedService = cachedService as? T {
            return cachedService
        }

        guard let newInstance = builder(self) as? T else {
            logError(objectName)
        }

        sync { singletones[objectName] = newInstance }
        return newInstance
    }

    private func sync<T>(action: () -> T) -> T {
        Self.lock.lock()
        let result = action()
        Self.lock.unlock()
        return result
    }

    private func logError(_ objectName: String) -> Never {
        fatalError("Unregistered dependency - \(objectName)!")
    }
}
