import React, { useEffect } from 'react';
import { CloseIcon } from './Icon';

interface FullscreenImageViewerProps {
    src: string;
    onClose: () => void;
}

const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({ src, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white hover:text-blue-400 transition-colors z-50"
                aria-label="Close fullscreen view"
            >
                <CloseIcon className="w-10 h-10" />
            </button>
            <div className="relative max-w-[95vw] max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <img 
                    src={`data:image/png;base64,${src}`} 
                    alt="Fullscreen view" 
                    className="object-contain w-full h-full"
                />
            </div>
        </div>
    );
};

export default FullscreenImageViewer;
