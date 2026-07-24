import SwiftUI
import VisionKit

/// Wrapper om VNDocumentCameraViewController — scant een bonnetje en levert
/// de eerste pagina terug als JPEG-data.
struct DocumentScannerView: UIViewControllerRepresentable {
    let onScan: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan, dismiss: dismiss)
    }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: (Data) -> Void
        let dismiss: DismissAction

        init(onScan: @escaping (Data) -> Void, dismiss: DismissAction) {
            self.onScan = onScan
            self.dismiss = dismiss
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            defer { dismiss() }
            guard scan.pageCount > 0, let data = scan.imageOfPage(at: 0).jpegData(compressionQuality: 0.85) else { return }
            onScan(data)
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            dismiss()
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            dismiss()
        }
    }
}
