import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CardDTO, PackDto } from '../models/pack.model';

@Injectable({ providedIn: 'root' })
export class PackService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAllPacks(): Observable<PackDto[]> {
    return this.http.get<PackDto[]>(`${this.base}/pack`);
  }

  createPack(name: string): Observable<PackDto> {
    return this.http.put<PackDto>(`${this.base}/pack/create`, null, {
      params: { packName: name },
    });
  }

  deletePack(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/pack/${id}`);
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

  deleteCard(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/card/${id}`);
  }
}
