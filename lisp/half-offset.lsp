;;; ======================================================================
;;;  HALF-OFFSET.LSP
;;;  ----------------------------------------------------------------------
;;;  Pick a LINE and the routine creates two copies of it - one offset to
;;;  the LEFT of the original and one offset to the RIGHT - then erases the
;;;  line you picked (see *OHLR-KEEP-ORIGINAL* if you want to keep it).
;;;
;;;  Command :  OHLR          (aliases: OH, HALFOFF)
;;;  Prompt  :  "Select LINE(s) to offset:"  -> window/pick, 1 or many
;;;             "Offset distance (applied to EACH side) <10.0000>:"
;;;
;;;  Settings (edit below, or set them once at the command line, e.g.
;;;            (setq *ohlr-split-total* T) ):
;;;    *OHLR-SPLIT-TOTAL*  nil = typed distance goes to EACH side  (default)
;;;                         T  = typed distance is the TOTAL spread,
;;;                              so half of it goes left and half right
;;;    *OHLR-KEEP-ORIGINAL* nil = erase the picked line(s)         (default)
;;;                          T  = keep them as a centre line
;;;
;;;  Notes :  * Works in AutoCAD 2000+ and in the clones that ship the
;;;             ActiveX/COM bridge (BricsCAD, ZWCAD, GstarCAD).
;;;           * Primary method is vla-Offset, so it is exact in any UCS and
;;;             works on 3D lines too. If COM is unavailable it silently
;;;             falls back to plain vector maths + ENTMAKE.
;;;           * The new lines inherit layer / colour / linetype / lineweight
;;;             from the line you picked.
;;;           * The whole command is ONE undo step (Ctrl+Z restores all).
;;; ======================================================================

(vl-load-com)

;;; ---------------------------- settings -------------------------------
;;; defaults are installed on the FIRST load only, so a re-APPLOAD does not
;;; throw away values you changed by hand in the current drawing session.
(if (null *ohlr-loaded*)
  (progn
    (setq *ohlr-split-total*   nil)   ; nil = distance per side | T = total spread
    (setq *ohlr-keep-original* nil)   ; nil = erase picked line | T = keep it
    (setq *ohlr-dist*          nil)   ; remembered distance (per side)
    (setq *ohlr-loaded*        T)
  )
)

;;; ------------------------- tiny vector helpers -----------------------
(defun ohlr:vadd  (a b)  (mapcar '+ a b))
(defun ohlr:vsub  (a b)  (mapcar '- a b))
(defun ohlr:vmul  (a s)  (mapcar '(lambda (x) (* x s)) a))
(defun ohlr:vlen  (a)    (sqrt (apply '+ (mapcar '(lambda (x) (* x x)) a))))
(defun ohlr:vunit (a / d)
  (if (> (setq d (ohlr:vlen a)) 1e-12)
    (ohlr:vmul a (/ 1.0 d))
  )
)

;;; ------------------- ActiveX offset (primary method) -----------------
;;; returns the list of new vla-objects, or nil if the offset failed
(defun ohlr:offset-vla (obj dist / res)
  (setq res
        (vl-catch-all-apply
          '(lambda (o d)
             (vlax-safearray->list (vlax-variant-value (vla-Offset o d)))
           )
          (list obj dist)
        )
  )
  (if (vl-catch-all-error-p res) nil res)
)

;;; ------------- geometry offset (fallback: no COM available) ----------
(defun ohlr:entmake-line (ed p1 p2 / data)
  (setq data (vl-remove-if '(lambda (g) (member (car g) '(-1 5 102 330 360)))
                           ed
             )
  )
  (entmake (subst (cons 11 p2) (assoc 11 data)
                  (subst (cons 10 p1) (assoc 10 data) data)
           )
  )
)

(defun ohlr:offset-geom (ename half / ed p1 p2 dir perp)
  (setq ed  (entget ename)
        p1  (cdr (assoc 10 ed))
        p2  (cdr (assoc 11 ed))
        dir (ohlr:vunit (list (- (car p2) (car p1))
                              (- (cadr p2) (cadr p1))
                              0.0
                        )
        )
  )
  (if dir
    (progn
      ;; perpendicular, 90 degrees counter-clockwise = the LEFT side
      (setq perp (list (- (cadr dir)) (car dir) 0.0))
      (and (ohlr:entmake-line ed
                              (ohlr:vadd p1 (ohlr:vmul perp half))
                              (ohlr:vadd p2 (ohlr:vmul perp half))
             )
           (ohlr:entmake-line ed
                              (ohlr:vsub p1 (ohlr:vmul perp half))
                              (ohlr:vsub p2 (ohlr:vmul perp half))
             )
      )
    )
  )
)

;;; ------------------ offset ONE line to both sides --------------------
;;; returns 2 when both sides were created, 0 when the line was skipped
(defun ohlr:offset-one (ename half / obj a b done)
  (setq done 0)
  ;; 1) ActiveX route ---------------------------------------------------
  (setq obj (vl-catch-all-apply 'vlax-ename->vla-object (list ename)))
  (if (not (vl-catch-all-error-p obj))
    (progn
      (setq a (ohlr:offset-vla obj half)
            b (ohlr:offset-vla obj (- half))
      )
      (cond
        ((and a b) (setq done 2))
        (T
          ;; one side failed -> roll the other one back, then try maths
          (if a (foreach o a (vl-catch-all-apply 'vla-delete (list o))))
          (if b (foreach o b (vl-catch-all-apply 'vla-delete (list o))))
        )
      )
    )
  )
  ;; 2) plain vector maths ----------------------------------------------
  (if (= done 0)
    (if (ohlr:offset-geom ename half)
      (setq done 2)
    )
  )
  done
)

;;; ============================ MAIN COMMAND ============================
(defun c:OHLR ( / *error* ss i n ename made fail half dist def prompt)

  (defun *error* (msg)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*QUIT*,*EXIT*,*BREAK*")))
      (princ (strcat "\nOHLR error: " msg))
    )
    (princ)
  )

  (princ "\nHALF OFFSET - copies the picked line(s) to BOTH sides.")
  (princ "\nSelect LINE(s) to offset: ")
  (setq ss (ssget '((0 . "LINE"))))

  (if (null ss)
    (princ "\nNo LINE selected - nothing to do.")
    (progn
      ;; ---- distance ----------------------------------------------------
      (setq def (cond ((null *ohlr-dist*)   nil)
                      (*ohlr-split-total*   (* 2.0 *ohlr-dist*))
                      (T                    *ohlr-dist*)
                )
            prompt (strcat "\nOffset distance "
                           (if *ohlr-split-total*
                             "(TOTAL spread - half left, half right)"
                             "(applied to EACH side)"
                           )
                           (if def (strcat " <" (rtos def) ">: ") ": ")
                     )
      )
      (initget 6)                                    ; no zero, no negative
      (setq dist (getdist prompt))
      (if (null dist) (setq dist def))               ; Enter = use default

      (cond
        ((or (null dist) (<= dist 0.0))
         (princ "\nNo distance given - cancelled.")
        )
        (T
         (setq half  (if *ohlr-split-total* (/ dist 2.0) dist)
               *ohlr-dist* half
               n     (sslength ss)
               i     0
               made  0
               fail  0
         )
         (princ (strcat "\n" (itoa n) " line(s), "
                        (rtos half) " to the left and "
                        (rtos half) " to the right."
                  )
         )
         ;; ---- create both sides --------------------------------------
         (while (< i n)
           (setq ename (ssname ss i)
                 i     (1+ i)
           )
           (if (= (ohlr:offset-one ename half) 2)
             (setq made (+ made 2))
             (progn
               (setq fail (1+ fail))
               (princ "\n  ! one line could not be offset (zero length?)")
             )
           )
         )
         ;; ---- erase the originals ------------------------------------
         (cond
           (*ohlr-keep-original*
            (princ "\nOriginal line(s) kept as centre line.")
           )
           ((> fail 0)
            (princ "\nOriginals kept (some offsets failed).")
           )
           (T
            (setq i 0)
            (while (< i n)
              (setq ename (ssname ss i)
                    i     (1+ i)
              )
              (if (entget ename) (entdel ename))
            )
            (princ (strcat "\n" (itoa n) " original line(s) erased."))
           )
         )
         (princ (strcat "\nCreated " (itoa made) " offset line(s)"
                        (if (> fail 0)
                          (strcat ", " (itoa fail) " failed")
                          ""
                        )
                        "."
                  )
         )
        )
      )
    )
  )
  (princ)
)

;;; ------------------------------ aliases ------------------------------
(defun c:OH      () (c:OHLR))
(defun c:HALFOFF () (c:OHLR))

(princ "\nHALF-OFFSET loaded -> type OHLR (or OH) to run.")
(princ)
