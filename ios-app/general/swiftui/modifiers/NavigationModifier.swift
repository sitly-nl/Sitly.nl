//
//  NavigationModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct NavigationModifier: ViewModifier {
    @State private var navDestination: NavigationKind = .none
    let navDestinationSelection: Binding<NavigationKind?>

    func body(content: Content) -> some View {
        ZStack {
            content
            NavigationTriggerView(tag: navDestination, selection: navDestinationSelection)
        }
        .onChange(of: navDestinationSelection.wrappedValue) { newValue in
            guard let newNavDestination = newValue else {
                navDestination = .none
                return
            }
            navDestination = newNavDestination
        }
    }
}

extension View {
    func navigationListener(_ navDestination: Binding<NavigationKind?>) -> some View {
        modifier(NavigationModifier(navDestinationSelection: navDestination))
    }
}
