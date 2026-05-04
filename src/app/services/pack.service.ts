import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { CardDTO, PackDto } from '../models/pack.model';

@Injectable({ providedIn: 'root' })
export class PackService {
  private readonly http = inject(HttpClient);
  private readonly base = '';

  getAllPacks(): Observable<PackDto[]> {
    return this.http.get<PackDto[]>(`${this.base}/pack`);
  }

  createPack(name: string): Observable<PackDto> {
    return this.http.put<PackDto>(`${this.base}/pack/create`, null, {
      params: { packName: name },
    });
  }

  deletePack(_id: string): Observable<never> {
    console.warn('TODO: DELETE /pack/:id not yet implemented in the backend');
    return EMPTY;
  }

  getCardsByPack(packId: string): Observable<CardDTO[]> {
    return this.http.get<CardDTO[]>(`${this.base}/pack/${packId}/cards`);
  }

  uploadCard(name: string, packId: string, image: File): Observable<CardDTO> {
    const form = new FormData();
    form.append('name', name);
    form.append('packId', packId);
    form.append('image', image);
    return this.http.put<CardDTO>(`${this.base}/card/create`, form);
  }

  deleteCard(_id: string): Observable<never> {
    console.warn('TODO: DELETE /card/:id not yet implemented in the backend');
    return EMPTY;
  }
}
