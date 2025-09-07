import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ExpandIcon } from './Icon';

const PanoramaViewer: React.FC<{ src: string }> = ({ src }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    
    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 0.01;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const texture = new THREE.TextureLoader().load(`data:image/png;base64,${src}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    let isUserInteracting = false;
    let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
    let lon = 0, onPointerDownLon = 0;
    let lat = 0, onPointerDownLat = 0;

    const onPointerDown = (event: PointerEvent) => {
        isUserInteracting = true;
        onPointerDownMouseX = event.clientX;
        onPointerDownMouseY = event.clientY;
        onPointerDownLon = lon;
        onPointerDownLat = lat;
    };

    const onPointerMove = (event: PointerEvent) => {
        if (isUserInteracting) {
            lon = (onPointerDownMouseX - event.clientX) * 0.15 + onPointerDownLon;
            lat = (event.clientY - onPointerDownMouseY) * 0.15 + onPointerDownLat;
        }
    };

    const onPointerUp = () => {
        isUserInteracting = false;
    };
    
    const onDocumentMouseWheel = (event: WheelEvent) => {
        const fov = camera.fov + event.deltaY * 0.05;
        camera.fov = THREE.MathUtils.clamp(fov, 20, 90);
        camera.updateProjectionMatrix();
    };

    currentMount.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    currentMount.addEventListener('wheel', onDocumentMouseWheel);

    const animate = () => {
        requestAnimationFrame(animate);
        lat = Math.max(-85, Math.min(85, lat));
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.target = new THREE.Vector3(
            500 * Math.sin(phi) * Math.cos(theta),
            500 * Math.cos(phi),
            500 * Math.sin(phi) * Math.sin(theta)
        );
        camera.lookAt(camera.target);
        renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!currentMount) return;
        const container = containerRef.current;
        if (!container) return;

        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const fullscreenChangeHandler = () => {
        setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
        currentMount.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        currentMount.removeEventListener('wheel', onDocumentMouseWheel);
        currentMount.removeChild(renderer.domElement);
        texture.dispose();
        material.dispose();
        geometry.dispose();
    };
  }, [src]);

  return (
    <div ref={containerRef} className="relative w-full h-[50vh] md:h-[60vh] rounded-lg overflow-hidden border-2 border-blue-500/60 shadow-glow-blue bg-black/30 p-1">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        <button 
            onClick={toggleFullscreen} 
            className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-blue-500/80 transition-colors z-10"
            aria-label="Toggle fullscreen"
        >
            <ExpandIcon className="w-6 h-6" />
        </button>
    </div>
  );
};

export default PanoramaViewer;
