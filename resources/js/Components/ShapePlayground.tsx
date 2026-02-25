import React, { useEffect, useRef, useState } from "react";
import {
  Engine,
  Render,
  World,
  Bodies,
  Body,
  Runner,
  Mouse,
  MouseConstraint,
  Vector,
} from "matter-js";
import { motion } from "framer-motion";

type ShapeType = "circle" | "square" | "rectangle" | "triangle";

type Shape = {
  id: number;
  type: ShapeType;
  color: string;
  size: number;
  body?: Body;
};

const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#F43F5E"];

export default function ShapePlayground() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [activeShapeId, setActiveShapeId] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("rectangle");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [selectedSize, setSelectedSize] = useState(60);

  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Engine.create());
  const mouseRef = useRef({ x: 0, y: 0 });

  // Setup Matter.js world
  useEffect(() => {
    const engine = engineRef.current;
    const world = engine.world;

    if (!sceneRef.current) return;

    const width = 700;
    const height = 450;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
      },
    });

    const walls = [
      Bodies.rectangle(width / 2, height, width, 20, { isStatic: true }),
      Bodies.rectangle(width / 2, 0, width, 20, { isStatic: true }),
      Bodies.rectangle(0, height / 2, 20, height, { isStatic: true }),
      Bodies.rectangle(width, height / 2, 20, height, { isStatic: true }),
    ];
    World.add(world, walls);

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    World.add(world, mouseConstraint);
    render.mouse = mouse;

    render.canvas.addEventListener("mousemove", (e) => {
      const rect = render.canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  // Add a new shape
  const addShape = () => {
    if (shapes.length >= 10) return;

    const engine = engineRef.current;
    const world = engine.world;

    const renderOpts = {
      fillStyle: selectedColor,
      strokeStyle: selectedColor,
      lineWidth: 0,
    };

    let body;
    switch (selectedShape) {
      case "circle":
        body = Bodies.circle(350, 50, selectedSize / 2, {
          restitution: 0.5,
          render: renderOpts,
        });
        break;
      case "square":
        body = Bodies.rectangle(350, 50, selectedSize, selectedSize, {
          restitution: 0.5,
          render: renderOpts,
        });
        break;
      case "rectangle":
        body = Bodies.rectangle(350, 50, selectedSize * 1.5, selectedSize, {
          restitution: 0.5,
          render: renderOpts,
        });
        break;
      case "triangle":
        body = Bodies.polygon(350, 50, 3, selectedSize, {
          restitution: 0.5,
          render: renderOpts,
        });
        break;
    }

    if (body) {
      const newShape: Shape = {
        id: Date.now(),
        type: selectedShape,
        color: selectedColor,
        size: selectedSize,
        body,
      };
      setShapes((prev) => [...prev, newShape]);
      setActiveShapeId(newShape.id);
      World.add(world, body);
    }
  };

  // Remove the last shape
  const removeShape = () => {
    if (shapes.length === 0) return;

    const engine = engineRef.current;
    const world = engine.world;

    const lastShape = shapes[shapes.length - 1];
    if (lastShape.body) {
      World.remove(world, lastShape.body);
    }
    setShapes((prev) => prev.slice(0, prev.length - 1));
  };

  // Hover-based physics
  useEffect(() => {
    const interval = setInterval(() => {
      shapes.forEach((shape) => {
        if (!shape.body) return;

        const pos = shape.body.position;
        const mousePos = mouseRef.current;

        const dx = mousePos.x - pos.x;
        const dy = mousePos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          const force = 0.0015;
          const direction = Vector.normalise({ x: dx, y: dy });
          Body.applyForce(shape.body, pos, Vector.mult(direction, force));

          const maxVel = 8;
          Body.setVelocity(shape.body, {
            x: Math.max(Math.min(shape.body.velocity.x, maxVel), -maxVel),
            y: Math.max(Math.min(shape.body.velocity.y, maxVel), -maxVel),
          });
        }

        shape.body.frictionAir = 0.05;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [shapes]);

  return (
    <motion.div
      className="flex flex-col items-center gap-8 w-full relative"
      initial={{ opacity: 0, y: -30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
    >


      {/* Settings Menu */}
      <motion.div
        className="w-[700px] bg-white/20 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/40 p-6 rounded-3xl shadow-lg flex flex-wrap gap-6 items-center justify-between"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Shape Selection */}
        <div>
          <label className="block mb-2 text-sm font-semibold dark:text-white">Shape</label>
          <select
            value={selectedShape}
            onChange={(e) => setSelectedShape(e.target.value as ShapeType)}
            className="p-2 rounded-lg border dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="rectangle">Rectangle</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>

        {/* Colour Selection */}
        <div>
          <label className="block mb-2 text-sm font-semibold dark:text-white">Colour</label>
          <div className="flex gap-3">
            {colors.map((color) => (
              <motion.button
                key={color}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                style={{ backgroundColor: color }}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color ? "ring-2 ring-blue-500" : "border-gray-300"
                }`}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Size Slider */}
        <div className="flex flex-col w-40">
          <label className="mb-2 text-sm font-semibold dark:text-white">Size</label>
          <input
            type="range"
            min={20}
            max={120}
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            className="accent-blue-500"
          />
        </div>

        {/* Add / Remove Buttons */}
        <div className="flex gap-3 mt-4 sm:mt-0">
          <motion.button
            onClick={addShape}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow hover:from-blue-600 hover:to-indigo-600"
          >
            Add
          </motion.button>
          <motion.button
            onClick={removeShape}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg shadow hover:from-red-600 hover:to-pink-600"
          >
            Remove
          </motion.button>
        </div>
      </motion.div>

      {/* Playground */}
      <motion.div
        ref={sceneRef}
        className="relative w-[700px] h-[450px] rounded-3xl shadow-2xl 
                   bg-white/10 dark:bg-gray-900/20 border border-white/20 dark:border-gray-700/40 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      />
    </motion.div>
  );
}
