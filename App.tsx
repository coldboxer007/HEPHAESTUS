
import React, { useState, useCallback } from 'react';
import { AppStep, Blueprint, Room } from './types';
import { generateFromImageAndText, generatePanoramaFromRooms, generateFromMultipleImagesAndText } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { UploadIcon, BuildingIcon, EditIcon, CameraIcon, TourIcon, DownloadIcon, ChevronLeftIcon, ChevronRightIcon, ThunderboltIcon, ExpandIcon } from './components/Icon';
import PanoramaViewer from './components/PanoramaViewer';
import FuturisticBackground from './components/FuturisticBackground';
import FullscreenImageViewer from './components/FullscreenImageViewer';
import Logo from './components/Logo';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [topDownImage, setTopDownImage] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeTour, setActiveTour] = useState<{ roomName: string, panorama: string } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setBlueprint({
                    base64: base64String,
                    mimeType: file.type,
                    name: file.name
                });
                setError(null);
            };
            reader.onerror = () => {
                setError("Failed to read the file.");
            }
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateTopDown = useCallback(async () => {
        if (!blueprint) return;
        setIsLoading(true);
        setLoadingMessage('Converting blueprint to top-down view...');
        setError(null);
        try {
            const initialPrompt = "Transform this architectural blueprint into a photorealistic, fully furnished top-down 2D floor plan. The interior design style should be modern and minimalist, with a neutral color palette. Ensure the layout from the blueprint is accurately represented.";
            const result = await generateFromImageAndText(blueprint.base64, blueprint.mimeType, initialPrompt);
            setTopDownImage(result);
            setStep(AppStep.TOP_DOWN);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [blueprint]);
    
    const handleEditTopDown = useCallback(async () => {
        if (!topDownImage || !prompt) return;
        setIsLoading(true);
        setLoadingMessage('Customizing your design...');
        setError(null);
        try {
            const result = await generateFromImageAndText(topDownImage, 'image/png', prompt);
            setTopDownImage(result);
            setPrompt('');
        } catch(e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [topDownImage, prompt]);

    const handleGenerateRoom = useCallback(async () => {
        if (!prompt || !topDownImage) {
            setError("Please provide a room description and ensure the top-down view is generated.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const newRenders: string[] = [];
        
        try {
            // Angle 1: Generate from the top-down view. This becomes the reference image.
            setLoadingMessage(`Rendering room... Angle 1 of 2 (Forward View)`);
            const firstRenderPrompt = `**Primary Goal:** Create a photorealistic, eye-level, forward-facing interior render of a room.

**Inputs:** You are given a top-down 2D floor plan. This floor plan is the **single source of truth** for both the room's layout AND its **architectural and decorative style** (e.g., modern, Roman, minimalist).

**Task:**
1.  **Analyze the Floor Plan:** Carefully observe the style, materials, furniture, and colors depicted in the top-down view.
2.  **Adhere to the Style:** Your generated eye-level render **must** perfectly match the aesthetic established in the floor plan.
3.  **Render the Specific Room:** Within this established style, generate the view for the following specific room: "${prompt}".

The final output should be a single image that looks like a photograph taken inside the world defined by the top-down floor plan.`;
            const firstRender = await generateFromImageAndText(topDownImage, 'image/png', firstRenderPrompt);
            newRenders.push(firstRender);

            // Function to generate subsequent angles to avoid repetition
            const generateSubsequentAngle = async (angleIndex: number, viewName: string) => {
                setLoadingMessage(`Rendering room... Angle ${angleIndex + 1} of 2 (${viewName} View)`);
                const direction = viewName.toLowerCase();
                const renderPrompt = `**CRITICAL TASK: RENDER A NEW PERSPECTIVE.**

You are provided with two images:
1.  **Image 1: A top-down floor plan (the 'map').**
2.  **Image 2: An existing room render (the 'style guide').**

Your goal is to generate a new, photorealistic render of the room: "${prompt}".

**THE SINGLE MOST IMPORTANT INSTRUCTION:**
The camera for your new render must be positioned in the same spot as the 'style guide' render, but **rotated exactly 90 degrees to the ${direction.toUpperCase()}**. You must show what is to the ${direction}.

**HOW TO SUCCEED:**
1.  **Use the 'map' (Image 1) to understand the room's layout.** This is your primary source for what walls, windows, and large furniture pieces should be visible in the new, rotated view.
2.  **Use the 'style guide' (Image 2) ONLY to copy the visual style.** This includes the color palette, lighting, material textures, and furniture models.
3.  **DO NOT COPY THE CAMERA ANGLE or composition of the 'style guide' (Image 2).** Your task is to create a completely new composition based on the 90-degree rotation, informed by the map.

**OUTPUT:** A single image file of the newly rendered perspective. Do not output any text.`;
                
                return await generateFromMultipleImagesAndText(
                    [
                        { base64: topDownImage, mimeType: 'image/png' },      // Image 1: Map
                        { base64: firstRender, mimeType: 'image/png' }       // Image 2: Style
                    ],
                    renderPrompt
                );
            };

            // Angle 2: Generate from the first render (for style) AND the top-down view (for layout).
            const secondRender = await generateSubsequentAngle(1, 'Left');
            newRenders.push(secondRender);
            
            const newRoom: Room = {
                id: Date.now().toString(),
                name: prompt,
                renders: newRenders,
            };

            setRooms(prev => [...prev, newRoom]);
            setPrompt('');

        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, topDownImage]);

    const handleGenerateTourForRoom = useCallback(async (room: Room) => {
        if (!topDownImage) {
            setError("A top-down view is required.");
            return;
        }
        if (room.renders.length < 2) {
            setError("This room does not have enough angles rendered to create a tour.");
            return;
        }
        setIsLoading(true);
        setLoadingMessage(`Analyzing renders for ${room.name}...`);
        setError(null);
        
        try {
            setLoadingMessage('Stitching panoramic view (this may take a moment)...');
            const panorama = await generatePanoramaFromRooms(topDownImage, room.renders);
            setActiveTour({ roomName: room.name, panorama: panorama });
            setStep(AppStep.TOUR);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [topDownImage]);
    
    const handleReset = () => {
        setStep(AppStep.UPLOAD);
        setBlueprint(null);
        setTopDownImage(null);
        setRooms([]);
        setActiveTour(null);
        setError(null);
        setPrompt('');
    };

    const downloadImage = (base64Image: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Image}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const NavItem: React.FC<{
        icon: React.ReactNode;
        label: string;
        itemStep: AppStep;
        enabled: boolean;
    }> = ({ icon, label, itemStep, enabled }) => {
        const isActive = step === itemStep;
        return (
            <button
                onClick={() => setStep(itemStep)}
                disabled={!enabled}
                className={`flex flex-col items-center justify-center space-y-2 p-3 w-full rounded-lg transition-all duration-300 text-center ${
                    isActive
                        ? 'bg-blue-900/50 text-white shadow-inset-glow-blue border border-blue-500/80'
                        : enabled
                        ? 'text-gray-400 hover:bg-gray-800/70 hover:text-blue-300'
                        : 'text-gray-600 cursor-not-allowed'
                }`}
                aria-current={isActive ? 'step' : undefined}
            >
                <div className={`transition-colors duration-300 ${isActive ? 'text-blue-400 animate-pulse' : ''}`}>{icon}</div>
                <span className="text-xs sm:text-sm font-semibold tracking-wider">{label}</span>
            </button>
        );
    };
    
    const StepIndicator = () => {
        const steps = [
            { id: AppStep.UPLOAD, label: 'Upload Blueprint', icon: <UploadIcon className="w-7 h-7" />, enabled: true },
            { id: AppStep.TOP_DOWN, label: 'Visualize & Edit', icon: <BuildingIcon className="w-7 h-7" />, enabled: !!blueprint },
            { id: AppStep.ROOM_RENDER, label: 'Render Rooms', icon: <CameraIcon className="w-7 h-7" />, enabled: !!topDownImage },
            { id: AppStep.TOUR, label: '360° Tour', icon: <TourIcon className="w-7 h-7" />, enabled: !!topDownImage },
        ];

        return (
            <aside className="w-48 bg-black/50 p-4 border-r border-blue-500/20 flex flex-col space-y-4">
                {steps.map((s) => (
                    <NavItem key={s.id} icon={s.icon} label={s.label} itemStep={s.id} enabled={s.enabled} />
                ))}
            </aside>
        );
    };

    const renderUploadStep = () => (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-blue-300">Step 1: Upload Your Blueprint</h2>
            <p className="text-gray-400 mb-8">Initiate the process by uploading a 2D architectural blueprint (PNG, JPG).</p>
            <div className="max-w-2xl mx-auto border-2 border-dashed border-blue-500/50 rounded-lg p-10 hover:border-blue-400 transition-colors bg-blue-900/10 hover:bg-blue-900/20 shadow-glow-blue">
                <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <UploadIcon className="w-16 h-16 text-blue-400/70 mb-4" />
                    <span className="text-blue-300 font-bold text-xl">Click to upload</span>
                    <span className="text-gray-500 text-sm mt-1">{blueprint ? blueprint.name : 'or drag and drop'}</span>
                </label>
            </div>
            {blueprint && (
                 <div className="group mt-8 flex flex-col items-center">
                    <div className="p-2 border border-blue-500/30 rounded-lg bg-black/30 shadow-glow-blue">
                        <div className="relative overflow-hidden rounded-md scanline-effect">
                            <img src={`data:${blueprint.mimeType};base64,${blueprint.base64}`} alt="Blueprint preview" className="max-h-60 rounded-md" />
                        </div>
                    </div>
                    <button onClick={handleGenerateTopDown} className="mt-6 font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 text-white bg-blue-500/20 border border-blue-500 hover:bg-blue-500/40 shadow-glow-blue">
                        <BuildingIcon className="w-5 h-5" />
                        <span>Generate Top-Down View</span>
                    </button>
                 </div>
            )}
        </div>
    );

    const renderTopDownStep = () => (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-blue-300">Step 2: Visualize & Customize</h2>
            <p className="text-gray-400 mb-8">Review the AI-generated view and customize the interior using text prompts.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-2 text-gray-300">Original Blueprint</h3>
                    {blueprint && <div className="group p-1 border border-blue-500/20 rounded-lg bg-black/20 w-full"><div className="relative overflow-hidden rounded-md scanline-effect"><img src={`data:${blueprint.mimeType};base64,${blueprint.base64}`} alt="Blueprint" className="rounded-md w-full" /></div></div>}
                </div>
                <div className="flex flex-col items-center">
                     <h3 className="text-lg font-semibold mb-2 text-blue-300">AI Generated View</h3>
                    {topDownImage && <div className="group p-1 border border-blue-500/70 rounded-lg bg-black/20 w-full animate-pulse-glow"><div className="relative overflow-hidden rounded-md scanline-effect"><img src={`data:image/png;base64,${topDownImage}`} alt="Top-down view" className="rounded-md w-full" /></div></div>}
                </div>
            </div>
            <div className="mt-8 p-6 bg-black/30 rounded-lg border border-blue-500/30 shadow-glow-blue">
                <h3 className="text-xl font-bold mb-4 flex items-center space-x-2 text-blue-300"><EditIcon className="w-6 h-6"/><span>Customize Your Interior</span></h3>
                <p className="text-gray-400 mb-4 text-sm">e.g., "Add a large L-shaped sofa" or "Change flooring to dark hardwood".</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter your customization prompt..." className="flex-grow bg-black/50 border border-blue-500/50 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                    <button onClick={handleEditTopDown} disabled={!prompt} className="font-bold py-2 px-6 rounded-md transition-all text-white bg-green-500/20 border border-green-500 hover:bg-green-500/40 disabled:bg-gray-700/50 disabled:border-gray-600 disabled:cursor-not-allowed disabled:text-gray-500">Apply Changes</button>
                </div>
            </div>
        </div>
    );
    
    const renderRoomRenderStep = () => (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-blue-300">Step 3: Generate Room Renders</h2>
            <p className="text-gray-400 mb-8">Describe a room to generate multiple realistic, eye-level views for a 360° tour.</p>
            <div className="mt-8 p-6 bg-black/30 rounded-lg border border-blue-500/30 shadow-glow-blue max-w-3xl mx-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center space-x-2 text-blue-300"><CameraIcon className="w-6 h-6"/><span>Describe a New Room</span></h3>
                <p className="text-gray-400 mb-4 text-sm">e.g., "A spacious master bedroom with a king-sized bed and a view".</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter room description..." className="flex-grow bg-black/50 border border-blue-500/50 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                    <button onClick={handleGenerateRoom} disabled={!prompt} className="font-bold py-2 px-6 rounded-md transition-all text-white bg-green-500/20 border border-green-500 hover:bg-green-500/40 disabled:bg-gray-700/50 disabled:border-gray-600 disabled:cursor-not-allowed disabled:text-gray-500">Generate 2 Angles</button>
                </div>
            </div>
            
            {rooms.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-xl font-bold text-center mb-6 text-blue-300">Your Generated Rooms</h3>
                    <div className="space-y-8 max-w-5xl mx-auto">
                        {rooms.map((room) => (
                            <div key={room.id} className="p-4 bg-black/40 rounded-lg border border-blue-500/30">
                                <h4 className="text-lg font-semibold mb-4 text-blue-200">{room.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {room.renders.map((render, index) => (
                                        <div key={index} className="group relative overflow-hidden rounded-lg border border-blue-500/30 shadow-glow-blue p-1 bg-black/30">
                                            <div className="scanline-effect relative rounded-md">
                                                <img src={`data:image/png;base64,${render}`} alt={`${room.name}, angle ${index + 1}`} className="w-full h-full object-cover rounded-md"/>
                                            </div>
                                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button onClick={() => setFullscreenImage(render)} className="p-3 bg-blue-600/80 rounded-full text-white hover:bg-blue-500 shadow-glow-blue" aria-label="View fullscreen">
                                                    <ExpandIcon className="w-6 h-6" />
                                                </button>
                                                <button onClick={() => downloadImage(render, `${room.name.replace(/\s+/g, '_')}_angle_${index+1}.png`)} className="p-3 bg-blue-600/80 rounded-full text-white hover:bg-blue-500 shadow-glow-blue" aria-label="Download image">
                                                    <DownloadIcon className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
    
    const renderTourStep = () => (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-blue-300">Step 4: Experience the 360° Walkthrough</h2>
            <p className="text-gray-400 mb-8">Select a room with multiple angles to generate a seamless panoramic tour.</p>
            
            {activeTour ? (
                <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
                    <h3 className="text-2xl font-bold text-blue-200">360° Tour: {activeTour.roomName}</h3>
                    <PanoramaViewer src={activeTour.panorama} />
                    <div className="flex items-center gap-4">
                        <button onClick={() => downloadImage(activeTour.panorama, `${activeTour.roomName.replace(/\s+/g, '_')}_360_panorama.png`)} className="font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 text-white bg-blue-500/20 border border-blue-500 hover:bg-blue-500/40 shadow-glow-blue">
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download Panorama</span>
                        </button>
                        <button onClick={() => setActiveTour(null)} className="font-bold py-2 px-6 rounded-lg transition-all flex items-center space-x-2 text-white bg-gray-600/30 border border-gray-500 hover:bg-gray-600/50">
                            <ChevronLeftIcon className="w-5 h-5" />
                            <span>Select Another Room</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    {rooms.length > 0 ? (
                        <div className="space-y-6">
                            {rooms.map(room => (
                                <div key={room.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-blue-500/30 shadow-glow-blue">
                                    <div>
                                        <h4 className="text-lg font-semibold text-blue-200">{room.name}</h4>
                                        <p className="text-sm text-gray-400">{room.renders.length} angle{room.renders.length !== 1 ? 's' : ''} rendered</p>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateTourForRoom(room)}
                                        disabled={room.renders.length < 2}
                                        className="font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 text-white bg-blue-500/20 border border-blue-500 hover:bg-blue-500/40 shadow-glow-blue disabled:bg-gray-700/50 disabled:border-gray-600 disabled:cursor-not-allowed disabled:text-gray-500 disabled:transform-none"
                                    >
                                        <TourIcon className="w-5 h-5" />
                                        <span>Generate Tour</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-black/30 rounded-lg border border-blue-500/30">
                            <h3 className="text-xl font-bold text-blue-300">No rooms rendered yet</h3>
                            <p className="text-gray-400 mt-2">Go back to Step 3 to generate renders for your rooms.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );


    return (
        <div className="min-h-screen flex selection:bg-blue-500/30">
            <FuturisticBackground />
            {isLoading && <LoadingSpinner message={loadingMessage} />}
            {fullscreenImage && <FullscreenImageViewer src={fullscreenImage} onClose={() => setFullscreenImage(null)} />}
            <StepIndicator />
            <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative">
                <header className="flex justify-center text-center mb-10">
                    <Logo />
                </header>
                 
                <div className="text-center">
                     {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6">{error}</div>}
                    {step === AppStep.UPLOAD && renderUploadStep()}
                    {step === AppStep.TOP_DOWN && renderTopDownStep()}
                    {step === AppStep.ROOM_RENDER && renderRoomRenderStep()}
                    {step === AppStep.TOUR && renderTourStep()}
                </div>

                <button 
                    onClick={handleReset} 
                    className="fixed bottom-8 right-8 w-16 h-16 bg-red-800/50 border-2 border-red-500/80 rounded-full flex items-center justify-center text-red-400 hover:bg-red-700/60 hover:text-red-300 hover:scale-110 transition-all duration-300 animate-pulse-glow-red"
                    aria-label="Redo Process"
                >
                    <ThunderboltIcon className="w-8 h-8" />
                </button>
            </main>
        </div>
    );
};

export default App;
