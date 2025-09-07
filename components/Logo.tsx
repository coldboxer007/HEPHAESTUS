import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g style={{ filter: 'url(#neon-glow)' }}>
            {/* Anvil Body */}
            <path d="M12 42.5V38.5C12 36.2909 13.7909 34.5 16 34.5H48C50.2091 34.5 52 36.2909 52 38.5V42.5C52 44.7091 50.2091 46.5 48 46.5H44.5C44.5 51 40 54.5 32 54.5C24 54.5 19.5 51 19.5 46.5H16C13.7909 46.5 12 44.7091 12 42.5Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Flames */}
            <path d="M32 20C32.7163 18.0601 32.7163 16.0601 32 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M28 23C27.2837 21.0601 26.6264 18.5271 28 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M36 23C36.7163 21.0601 37.3736 18.5271 36 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M26 31C25.5 28 26 24 29 22 C32 20, 32 20, 35 22 C38 24, 38.5 28, 38 31" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </svg>
);


const Logo: React.FC = () => {
    return (
        <div className="flex flex-col items-center gap-4 text-center select-none">
            <LogoIcon className="w-24 h-24 text-cyan-400" />
            <div className="flex flex-col items-center gap-2">
                <h1
                    className="text-5xl md:text-6xl font-bold tracking-[0.3em] text-cyan-300"
                    style={{ textShadow: '0 0 5px #00d1ff, 0 0 10px #00d1ff, 0 0 20px #00d1ff, 0 0 40px #00d1ff' }}
                >
                    HEPHAESTUS
                </h1>
                <p
                    className="text-xl md:text-2xl font-semibold tracking-widest text-cyan-300/90"
                    style={{ textShadow: '0 0 5px #00d1ff, 0 0 10px #00d1ff' }}
                >
                    FORGE YOUR VISION
                </p>
                <p className="text-base md:text-lg text-cyan-300/70" style={{ textShadow: '0 0 5px #00d1ff' }}>
                    The architect’s divine assistant, now in code.
                </p>
            </div>
        </div>
    );
};

export default Logo;
