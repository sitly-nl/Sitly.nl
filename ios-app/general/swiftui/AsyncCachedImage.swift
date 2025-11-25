//
//  AsyncCachedImage.swift
//  sitly
//
//  Created by Kyrylo Filippov on 4/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct AsyncCachedImage<Content: View>: View {
    let url: URL?
    let placeholderImage: UIImage
    @ViewBuilder var content: (ScaledImage) -> Content

    @State private var image: UIImage?
    @State private var isCompletedLoading = false

    init(
        url: URL?,
        placeholderImage: UIImage,
        @ViewBuilder content: @escaping (ScaledImage) -> Content
    ) {
        self.url = url
        self.placeholderImage = placeholderImage
        self.content = content
    }

    var body: some View {
        ZStack {
            content(ScaledImage(image: Image(uiImage: placeholderImage), scaleToFit: true))
            if !isCompletedLoading {
                ProgressView().onAppear { performLoad() }
            } else if let image = image {
                content(ScaledImage(image: Image(uiImage: image), scaleToFit: false))
            }
        }
    }

    private func performLoad() {
        guard let url = url else {
            completeLoading(image: nil)
            return
        }
        UIImage.loadImage(from: url, completion: completeLoading)
    }

    private func completeLoading(image: UIImage?) {
        DispatchQueue.main.async {
            self.isCompletedLoading = true
            self.image = image
        }
    }
}

struct ScaledImage: View {
    let image: Image
    let scaleToFit: Bool

    var body: some View {
        if scaleToFit {
            image.resizable().scaledToFit()
        } else {
            image.resizable().scaledToFill()
        }
    }
}
