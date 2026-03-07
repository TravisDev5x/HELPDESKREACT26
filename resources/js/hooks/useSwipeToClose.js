import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook para cerrar un drawer con gesto de arrastre (swipe).
 * Pensado para Sheet/Dialog lateral: arrastrar hacia la izquierda cierra el panel.
 *
 * @param {React.RefObject<HTMLElement | null>} contentRef - Ref del elemento del panel (Sheet content)
 * @param {() => void} onClose - Callback al cerrar por gesto
 * @param {boolean} enabled - Si el gesto está activo (ej. cuando el sheet está abierto)
 * @param {{ side?: 'left' | 'right', threshold?: number, velocityThreshold?: number }} options
 *   - side: 'left' = arrastrar hacia la izquierda cierra
 *   - threshold: píxeles de arrastre para cerrar (default 80)
 *   - velocityThreshold: velocidad mínima (px/ms) para cerrar por inercia (default 0.35)
 */
export function useSwipeToClose(contentRef, onClose, enabled, options = {}) {
  const {
    side = 'left',
    threshold = 80,
    velocityThreshold = 0.35,
  } = options

  const startX = useRef(0)
  const startTime = useRef(0)
  const isDragging = useRef(false)
  const pointerId = useRef(null)
  const cleanupRef = useRef(null)

  const resetTransform = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    el.style.removeProperty('touch-action')
    el.style.transition = ''
    el.style.transform = ''
  }, [contentRef])

  useEffect(() => {
    if (!enabled) return

    function setupListeners(el) {

    const handleStart = (clientX, id) => {
      startX.current = clientX
      startTime.current = Date.now()
      isDragging.current = true
      pointerId.current = id
      el.style.touchAction = 'none'
      el.style.transition = 'none'
    }

    const handleMove = (clientX) => {
      if (!isDragging.current) return
      const delta = clientX - startX.current
      // Solo permitir arrastre en la dirección que cierra (left = delta negativo)
      const drag = side === 'left' ? Math.min(0, delta) : Math.max(0, delta)
      el.style.transform = `translateX(${drag}px)`
    }

    const handleEnd = (clientX) => {
      if (!isDragging.current) return
      isDragging.current = false
      pointerId.current = null
      el.style.touchAction = ''
      el.style.transition = 'transform 0.2s ease-out'

      const delta = clientX - startX.current
      const elapsed = Date.now() - startTime.current
      const velocity = elapsed > 0 ? Math.abs(delta) / elapsed : 0

      const pastThreshold = side === 'left' ? delta < -threshold : delta > threshold
      const fastSwipe = velocity > velocityThreshold

      if (pastThreshold || fastSwipe) {
        el.style.transition = 'none'
        el.style.transform = ''
        requestAnimationFrame(() => {
          onClose()
          resetTransform()
        })
      } else {
        el.style.transform = ''
      }
    }

    const onPointerDown = (e) => {
      if (e.button !== 0) return // solo botón principal
      handleStart(e.clientX, e.pointerId)
    }

    const onPointerMove = (e) => {
      if (e.pointerId !== pointerId.current) return
      handleMove(e.clientX)
    }

    const onPointerUp = (e) => {
      if (e.pointerId !== pointerId.current) return
      handleEnd(e.clientX)
    }

    const onPointerCancel = () => {
      isDragging.current = false
      pointerId.current = null
      el.style.touchAction = ''
      el.style.transition = 'transform 0.2s ease-out'
      el.style.transform = ''
    }

    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      resetTransform()
    }
    }

    const attach = () => {
      const el = contentRef.current
      if (el) {
        cleanupRef.current = setupListeners(el)
      }
    }

    attach()
    if (!contentRef.current) {
      const raf = requestAnimationFrame(attach)
      return () => {
        cancelAnimationFrame(raf)
        cleanupRef.current?.()
        cleanupRef.current = null
      }
    }
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [enabled, onClose, side, threshold, velocityThreshold, resetTransform, contentRef])
}
