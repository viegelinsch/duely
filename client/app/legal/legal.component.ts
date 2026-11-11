/**
 * This file contains the legal notice page required
 * to show the hoster of the page and other legal information
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

/**
 * Component used by Angular to find the corresponding HTML page
 * and to display the correct information
 */
@Component({
  selector: 'rac-impress',
  standalone: true,
  templateUrl: './legal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./legal.component.scss']
})
export class LegalComponent implements OnDestroy {

  public content = '';
  private langChangeSub: Subscription;

  constructor(private translate: TranslateService) {
    // The HTML string is assembled synchronously here, so instant() is required:
    // it returns the already-loaded translation immediately, whereas get() would
    // return an Observable and could not be interpolated into a plain string.
    this.buildContent();
    // Rebuild when the user switches language so /legal is never stale.
    this.langChangeSub = this.translate.onLangChange.subscribe(() => this.buildContent());
  }

  ngOnDestroy(): void {
    this.langChangeSub.unsubscribe();
  }

  private buildContent(): void {
    this.content = `<h1>${this.translate.instant('LEGAL NOTICE')}</h1>
    ${this.translate.instant('LEGAL DEFAULT MESSAGE')}
    ${this.translate.instant('LEGAL EDIT HINT')}`;
  }

}
