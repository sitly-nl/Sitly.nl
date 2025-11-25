//
//  ZoomableImageView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 24/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit
import SwiftUI

struct ZoomableImageView: UIViewRepresentable {
    let index: Int
    let imageURL: String
    let placeHolderImage: UIImage
    @Binding var zoomScale: [Int: CGFloat]

    func makeUIView(context: Context) -> UIScrollView {
        let scrollView = UIScrollView()
        let activity = CircleActivityIndicator()
        activity.color = .brandPrimary
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 5.0
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.delegate = context.coordinator

        let imageView = UIImageView(image: placeHolderImage)
        imageView.contentMode = .scaleAspectFit
        imageView.frame = scrollView.bounds
        imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        scrollView.addSubview(imageView)
        context.coordinator.imageView = imageView
        imageView.addSubview(activity)
        activity.translatesAutoresizingMaskIntoConstraints = false
        activity.centerYAnchor.constraint(equalTo: imageView.centerYAnchor).isActive = true
        activity.centerXAnchor.constraint(equalTo: imageView.centerXAnchor).isActive = true
        activity.startAnimating()

        if let url = URL(string: imageURL) {
            UIImage.loadImage(from: url) { image in
                DispatchQueue.main.async {
                    activity.stopAnimating()
                    guard image != nil else { return }
                    imageView.image = image
                }
            }
        }
        return scrollView
    }

    func updateUIView(_ uiView: UIScrollView, context: Context) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            uiView.setZoomScale(zoomScale[index] ?? 1.0, animated: false)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self, index: index)
    }

    class Coordinator: NSObject, UIScrollViewDelegate {
        let index: Int
        var parent: ZoomableImageView
        var imageView: UIImageView?

        init(_ parent: ZoomableImageView, index: Int) {
            self.parent = parent
            self.index = index
        }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? {
            return imageView
        }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            parent.zoomScale[index] = scrollView.zoomScale
        }
    }
}
