// TEMPORARY SCAFFOLDING — see (iii) below. Do not build features on this file.
//
// (i) WHY this file exists:
//     The spec ngtsc program (client/tsconfig.spec.json) contains no NgModule that
//     declares the `standalone: false` components. With no declaring NgModule visible
//     at compile time, each component's template scope is EMPTY, so every pipe
//     (translate), every directive (*ngIf/*ngFor/formControlName/ngModel/ngClass) and
//     every Material element (mat-form-field/mat-datepicker/…) is reported unknown —
//     NG8001/NG8002/NG8004/NG5002. `TestBed.configureTestingModule({ declarations, imports })`
//     is a RUNTIME construct and is invisible to compile-time template-scope resolution,
//     so it cannot supply that scope. Importing AppModule here makes the declaring
//     NgModule statically visible to the spec program, restoring the template scope.
//
// (ii) This is NOT a new concept:
//     client/tsconfig.spec.json's `include` ALREADY lists "test.ts" (line 15). The file
//     was simply missing, leaving a dangling reference. This repairs that reference
//     rather than introducing a new mechanism.
//
// (iii) It is TEMPORARY SCAFFOLDING:
//     This file is to be DELETED in Phase 5.5, together with client/app/app.module.ts,
//     once every component is `standalone: true` with its own `imports` array and
//     therefore carries its template scope with it — at which point no NgModule import
//     is needed to give the spec program compile-time scope.
import './app/app.module';
