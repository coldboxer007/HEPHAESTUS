import React, { useRef, useEffect } from 'react';

const FuturisticBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const gridSize = 50;
        let offsetX = 0;
        let offsetY = 0;
        let time = 0;

        // --- State Machine for Shape Formation ---
        enum AnimationState { SCATTER, GATHER, HOLD, RELEASE }
        let currentState = AnimationState.SCATTER;
        let stateChangeTimer = Date.now();
        let currentShapeIndex = -1;
        
        const DURATIONS = {
            [AnimationState.SCATTER]: 10000,
            [AnimationState.GATHER]: 4000,
            [AnimationState.HOLD]: 5000,
            [AnimationState.RELEASE]: 3000,
        };

        // --- Shape Definitions ---
        const interpolatePoints = (points: {x: number, y: number}[], numPointsPerSegment: number) => {
            const interpolated: {x: number, y: number}[] = [];
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                for (let j = 0; j < numPointsPerSegment; j++) {
                    const t = j / numPointsPerSegment;
                    interpolated.push({
                        x: p1.x * (1 - t) + p2.x * t,
                        y: p1.y * (1 - t) + p2.y * t,
                    });
                }
            }
            return interpolated;
        };

        const houseVertices = [{x: 0.2, y: 0.8}, {x: 0.8, y: 0.8}, {x: 0.8, y: 0.4}, {x: 0.5, y: 0.1}, {x: 0.2, y: 0.4}];
        const hammerVertices = [{x: 0.2, y: 0.2}, {x: 0.2, y: 0.1}, {x: 0.3, y: 0.1}, {x: 0.8, y: 0.2}, {x: 0.8, y: 0.3}, {x: 0.7, y: 0.4}, {x: 0.5, y: 0.4}, {x: 0.5, y: 0.9}, {x: 0.4, y: 0.9}, {x: 0.4, y: 0.4}, {x: 0.2, y: 0.3}];
        
        const shapes = [
            interpolatePoints(houseVertices, 20),
            interpolatePoints(hammerVertices, 10),
        ];

        const mouse = {
            x: -1000,
            y: -1000,
            radius: 150
        };

        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);

        class Particle {
            x: number;
            y: number;
            baseSize: number;
            size: number;
            speedX: number;
            speedY: number;
            density: number;
            pulseOffset: number;
            targetX: number | null = null;
            targetY: number | null = null;
            originalSpeedX: number;
            originalSpeedY: number;
            opacity: number = 1;
            targetOpacity: number = 1;

            constructor(width: number, height: number) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.baseSize = Math.random() * 2 + 1;
                this.size = this.baseSize;
                this.speedX = (Math.random() * 0.4 - 0.2);
                this.speedY = (Math.random() * 0.4 - 0.2);
                this.originalSpeedX = this.speedX;
                this.originalSpeedY = this.speedY;
                this.density = (Math.random() * 30) + 1;
                this.pulseOffset = Math.random() * Math.PI * 2;
            }

            update(width: number, height: number, time: number, state: AnimationState) {
                this.opacity += (this.targetOpacity - this.opacity) * 0.05;

                if (state === AnimationState.GATHER || state === AnimationState.HOLD) {
                    if (this.targetX !== null && this.targetY !== null) {
                        const dx = this.targetX - this.x;
                        const dy = this.targetY - this.y;
                        this.x += dx * 0.05;
                        this.y += dy * 0.05;

                        if (state === AnimationState.HOLD) {
                            this.x += Math.sin(time * 0.01 + this.pulseOffset) * 0.2;
                            this.y += Math.cos(time * 0.01 + this.pulseOffset) * 0.2;
                        }
                    }
                } else { // SCATTER or RELEASE
                    this.size = this.baseSize + Math.sin(time * 0.005 + this.pulseOffset) * 0.5;
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius) {
                        let forceDirectionX = dx / distance;
                        let forceDirectionY = dy / distance;
                        let maxDistance = mouse.radius;
                        let force = (maxDistance - distance) / maxDistance;
                        this.x -= forceDirectionX * force * this.density * 0.1;
                        this.y -= forceDirectionY * force * this.density * 0.1;
                    }

                    this.x += this.speedX;
                    this.y += this.speedY;

                    if (this.x > width + this.size || this.x < -this.size) this.speedX *= -1;
                    if (this.y > height + this.size || this.y < -this.size) this.speedY *= -1;
                }
            }

            draw(context: CanvasRenderingContext2D) {
                context.fillStyle = `rgba(59, 130, 246, ${0.9 * this.opacity})`;
                context.shadowColor = `rgba(59, 130, 246, ${this.opacity})`;
                context.shadowBlur = 10;
                context.beginPath();
                context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                context.closePath();
                context.fill();
                context.shadowBlur = 0;
            }
        }

        const assignParticlesToShape = (shapePoints: {x: number, y: number}[]) => {
            const shapeWidth = 0.4 * Math.min(canvas.width, canvas.height);
            const offsetX = (canvas.width - shapeWidth) / 2;
            const offsetY = (canvas.height - shapeWidth) / 2;

            particles.forEach(p => { p.targetOpacity = 0.1; });

            for (let i = 0; i < shapePoints.length; i++) {
                const particle = particles[i % particles.length];
                particle.targetX = shapePoints[i].x * shapeWidth + offsetX;
                particle.targetY = shapePoints[i].y * shapeWidth + offsetY;
                particle.speedX = 0;
                particle.speedY = 0;
                particle.targetOpacity = 1;
            }
        };

        const releaseParticles = () => {
            particles.forEach(p => {
                p.targetX = null;
                p.targetY = null;
                p.speedX = p.originalSpeedX;
                p.speedY = p.originalSpeedY;
                p.targetOpacity = 1;
            });
        };

        const updateState = () => {
            const now = Date.now();
            if (now - stateChangeTimer > DURATIONS[currentState]) {
                stateChangeTimer = now;
                const nextState = (currentState + 1) % 4;
                currentState = nextState as AnimationState;

                if (currentState === AnimationState.GATHER) {
                    currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
                    assignParticlesToShape(shapes[currentShapeIndex]);
                } else if (currentState === AnimationState.RELEASE) {
                    releaseParticles();
                }
            }
        };

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            const numberOfParticles = Math.floor((canvas.width * canvas.height) / 7500);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const drawGrid = (time: number) => {
             if (!ctx) return;
            const pulse = (Math.sin(time * 0.001) + 1) * 5;
            ctx.save();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.shadowColor = 'rgba(59, 130, 246, 1)';
            ctx.shadowBlur = 5 + pulse;
            ctx.lineWidth = 0.5;

            for (let x = (offsetX % gridSize) - gridSize; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = (offsetY % gridSize) - gridSize; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            ctx.restore();
        };
        
        const connectParticles = () => {
            if (!ctx || currentState !== AnimationState.SCATTER) return;
            let opacityValue = 1;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const distance = Math.hypot(particles[a].x - particles[b].x, particles[a].y - particles[b].y);
                    
                    if (distance < 140) {
                        opacityValue = 1 - (distance/140);
                        const distToMouseA = Math.hypot(mouse.x - particles[a].x, mouse.y - particles[a].y);
                        let mouseFactor = distToMouseA < mouse.radius ? (1 - (distToMouseA / mouse.radius)) : 0;

                        ctx.strokeStyle = `rgba(59, 130, 246, ${opacityValue * 0.4 + mouseFactor * 0.6})`;
                        ctx.lineWidth = 1 + mouseFactor * 1.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            time++;
            offsetX += 0.05;
            offsetY += 0.05;
            
            updateState();
            drawGrid(time);

            particles.forEach(p => {
                p.update(canvas.width, canvas.height, time, currentState);
                p.draw(ctx);
            });
            
            connectParticles();

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            cancelAnimationFrame(animationFrameId);
            init();
            animate();
        };

        init();
        animate();

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full -z-10 bg-black"
        />
    );
};

export default FuturisticBackground;
