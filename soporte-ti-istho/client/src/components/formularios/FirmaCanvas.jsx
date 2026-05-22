import { useRef, useEffect, useState } from 'react';
import { Button } from '../common/Button';

export function FirmaCanvas({ onChange, disabled, value }) {
  const canvasRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Refs para estado mutable accesible desde listeners sin stale closure
  const drawingRef = useRef(false);
  const lastPos = useRef(null);
  const hasSignatureRef = useRef(false);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Limpiar canvas cuando el padre resetea el valor (ej: formulario enviado con éxito)
  useEffect(() => {
    if (!value && canvasRef.current && hasSignatureRef.current) {
      const canvas = canvasRef.current;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      hasSignatureRef.current = false;
      setHasSignature(false);
    }
  }, [value]);

  // Inicializar canvas y registrar touch listeners con passive:false
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1B2340';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * (canvas.width / rect.width),
        y: (src.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    function onTouchStart(e) {
      if (disabledRef.current) return;
      e.preventDefault();
      drawingRef.current = true;
      lastPos.current = getPos(e);
    }

    function onTouchMove(e) {
      if (!drawingRef.current || disabledRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      const c = canvas.getContext('2d');
      c.beginPath();
      c.moveTo(lastPos.current.x, lastPos.current.y);
      c.lineTo(pos.x, pos.y);
      c.stroke();
      lastPos.current = pos;
      if (!hasSignatureRef.current) {
        hasSignatureRef.current = true;
        setHasSignature(true);
      }
    }

    function onTouchEnd(e) {
      if (!drawingRef.current) return;
      e.preventDefault();
      drawingRef.current = false;
      if (hasSignatureRef.current && onChangeRef.current) {
        onChangeRef.current(canvas.toDataURL('image/png'));
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // solo al montar — los refs mantienen los valores actualizados

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDraw(e) {
    if (disabled) return;
    drawingRef.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  }

  function draw(e) {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    if (!hasSignatureRef.current) {
      hasSignatureRef.current = true;
      setHasSignature(true);
    }
  }

  function stopDraw() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasSignatureRef.current && onChange) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
    if (onChange) onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={500}
        height={150}
        className="w-full border-2 border-dashed border-slate-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-900 cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {hasSignature ? 'Firma capturada' : 'Dibuja tu firma aquí'}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={limpiar} disabled={disabled}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
