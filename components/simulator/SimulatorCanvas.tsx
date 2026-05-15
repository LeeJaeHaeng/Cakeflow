"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Stage, Layer, Rect, Circle, Group, Text, TextPath, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import { useSimulatorStore, type SimObject } from "@/lib/simulator/store";

const CANVAS_SIZE = 400;

interface ObjectNodeProps {
  obj: SimObject;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<SimObject>) => void;
}

function ImageObjectNode({ obj, onSelect, onChange }: ObjectNodeProps) {
  const nodeRef = useRef<Konva.Image>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!obj.src) {
      queueMicrotask(() => setImage(null));
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      nodeRef.current?.getLayer()?.batchDraw();
    };
    img.src = obj.src;
  }, [obj.src]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    onChange({
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
      scaleX: 1,
      scaleY: 1,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  return (
    <KonvaImage
      ref={nodeRef}
      id={obj.id}
      image={image ?? undefined}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      scaleX={obj.scaleX}
      scaleY={obj.scaleY}
      opacity={obj.opacity ?? 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

function TextObjectNode({ obj, onSelect, onChange }: ObjectNodeProps) {
  const nodeRef = useRef<Konva.Text | Konva.TextPath>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    const width = "width" in node ? node.width() * node.scaleX() : obj.width;
    onChange({
      x: node.x(),
      y: node.y(),
      width,
      fontSize: (obj.fontSize ?? 24) * node.scaleX(),
      rotation: node.rotation(),
      scaleX: 1,
      scaleY: 1,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  if (obj.textMode === "arc") {
    const arcPath = "M 86 236 A 114 114 0 0 1 314 236";
    return (
      <TextPath
        ref={nodeRef as React.RefObject<Konva.TextPath>}
        id={obj.id}
        data={arcPath}
        text={obj.text ?? ""}
        x={obj.x}
        y={obj.y}
        rotation={obj.rotation}
        scaleX={obj.scaleX}
        scaleY={obj.scaleY}
        fontSize={obj.fontSize ?? 24}
        fill={obj.fill ?? "#333333"}
        fontFamily={obj.fontFamily ?? "Pretendard, sans-serif"}
        fontStyle={obj.fontStyle ?? "normal"}
        align={obj.align ?? "center"}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
    );
  }

  return (
    <Text
      ref={nodeRef as React.RefObject<Konva.Text>}
      id={obj.id}
      text={obj.text ?? ""}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      rotation={obj.rotation}
      scaleX={obj.scaleX}
      scaleY={obj.scaleY}
      fontSize={obj.fontSize ?? 24}
      fill={obj.fill ?? "#333333"}
      fontFamily={obj.fontFamily ?? "Pretendard, sans-serif"}
      fontStyle={obj.fontStyle ?? "normal"}
      align={obj.align ?? "center"}
      height={obj.height}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

function StickerObjectNode({ obj, onSelect, onChange }: ObjectNodeProps) {
  const nodeRef = useRef<Konva.Text>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    onChange({
      x: node.x(),
      y: node.y(),
      fontSize: (obj.fontSize ?? 48) * node.scaleX(),
      rotation: node.rotation(),
      scaleX: 1,
      scaleY: 1,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  return (
    <Text
      ref={nodeRef}
      id={obj.id}
      text={obj.src ?? "🎂"}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      scaleX={obj.scaleX}
      scaleY={obj.scaleY}
      fontSize={obj.fontSize ?? 48}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

interface SimulatorCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function SimulatorCanvas({ stageRef }: SimulatorCanvasProps) {
  const { objects, selectedId, bgColor, canvasShape, setSelected, updateObject, removeObject } = useSimulatorStore();
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);
  const cakeRadius = 168;
  const cakeCenter = CANVAS_SIZE / 2;
  const isRound = canvasShape === "round";

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId) {
      const stage = tr.getStage();
      const node = stage?.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        selectedNodeRef.current = node;
      } else {
        tr.nodes([]);
      }
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) removeObject(selectedId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, removeObject]);

  const handleDeselect = useCallback((e: { target: { getStage: () => unknown; name: () => string } }) => {
    if (e.target === e.target.getStage() || e.target.name() === "bg" || e.target.name() === "workspace") {
      setSelected(null);
    }
  }, [setSelected]);

  const objectNodes = objects.map((obj) => {
            const isSelected = obj.id === selectedId;
            const props: ObjectNodeProps = {
              obj,
              isSelected,
              onSelect: () => setSelected(obj.id),
              onChange: (updates) => updateObject(obj.id, updates),
            };

            if (obj.type === "text") return <TextObjectNode key={obj.id} {...props} />;
            if (obj.type === "sticker") return <StickerObjectNode key={obj.id} {...props} />;
            return <ImageObjectNode key={obj.id} {...props} />;
  });

  return (
    <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      <Stage
        ref={stageRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleDeselect as (e: Konva.KonvaEventObject<MouseEvent>) => void}
        onTap={handleDeselect as (e: Konva.KonvaEventObject<TouchEvent>) => void}
      >
        <Layer>
          <Rect
            name="workspace"
            x={0}
            y={0}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            fill={isRound ? "#F6EFEA" : bgColor}
          />

          {isRound ? (
            <>
              <Circle
                x={cakeCenter}
                y={cakeCenter}
                radius={cakeRadius + 10}
                fill="#8B6F66"
                opacity={0.14}
                shadowColor="#8B6F66"
                shadowBlur={18}
                shadowOpacity={0.22}
              />
              <Circle
                name="bg"
                x={cakeCenter}
                y={cakeCenter}
                radius={cakeRadius}
                fill={bgColor}
                stroke="#F5DFD8"
                strokeWidth={8}
              />
              <Group
                clipFunc={(ctx) => {
                  ctx.arc(cakeCenter, cakeCenter, cakeRadius - 4, 0, Math.PI * 2, false);
                }}
              >
                <Rect
                  name="bg"
                  x={cakeCenter - cakeRadius}
                  y={cakeCenter - cakeRadius}
                  width={cakeRadius * 2}
                  height={cakeRadius * 2}
                  fill={bgColor}
                />
                {objectNodes}
              </Group>
              <Circle
                x={cakeCenter}
                y={cakeCenter}
                radius={cakeRadius - 18}
                stroke="#FFFFFF"
                strokeWidth={1}
                opacity={0.45}
                listening={false}
              />
            </>
          ) : (
            <>
              <Rect
                name="bg"
                x={0}
                y={0}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                fill={bgColor}
              />
              {objectNodes}
            </>
          )}

          {/* Transformer — attach id attribute on nodes for lookup */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) return oldBox;
              return newBox;
            }}
            rotateEnabled
            keepRatio={false}
            borderStroke="#C8534A"
            anchorStroke="#C8534A"
            anchorFill="#fff"
            anchorSize={10}
          />
        </Layer>
      </Stage>
    </div>
  );
}

export { CANVAS_SIZE };
