from __future__ import annotations

import math
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='AuraLexia API', version='0.3.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://lucky-semolina-ab7175.netlify.app'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class GazeSample(BaseModel):
    x: float
    y: float
    t: int


class SessionBlock(BaseModel):
    studentName: str | None = None
    gradeOrAge: str | None = None
    startedAt: str | None = None


class AnalyzeRequest(BaseModel):
    exportedAt: str | None = None
    session: SessionBlock | None = None
    readingText: str | None = None
    sampleIntervalMsHint: int | None = None
    gazeSamples: list[GazeSample] = Field(default_factory=list)


class ChartSeries(BaseModel):
    time_ms: list[float] = Field(default_factory=list)
    dispersion_px: list[float] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    risk_label: str
    summary_text: str
    metrics: dict[str, Any]
    ram_guidance: str
    chart_series: ChartSeries


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'AuraLexia'}


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)


def _build_dispersion_chart_series(
    xs: list[float],
    ys: list[float],
    ts: list[int],
    mx: float,
    my: float,
    t_min: int,
    max_points: int = 72,
) -> ChartSeries:
    rel_ms = [float(t - t_min) for t in ts]
    disp = [round(_dist(x, y, mx, my), 2) for x, y in zip(xs, ys)]
    n = len(disp)
    if n <= max_points:
        return ChartSeries(time_ms=rel_ms, dispersion_px=disp)
    step = max(1, math.ceil(n / max_points))
    return ChartSeries(
        time_ms=[rel_ms[i] for i in range(0, n, step)],
        dispersion_px=[disp[i] for i in range(0, n, step)],
    )


def _ram_guidance(
    risk: str,
    regress_ratio: float,
    mean_dispersion: float,
    fixation_like: int,
    n: int,
) -> str:
    if n < 8:
        return (
            'Veri az olduğu için otomatik yönlendirme sınırlıdır. Tekrar ölçüm ve '
            'sınıf öğretmeni / okul rehber öğretmeni (RAM) ile görüşmeyi düşünün.'
        )
    if risk == 'Düşük Risk':
        return (
            'Bu özet yalnızca ekran gözlemi tabanlı bir MVP çıktısıdır. Öğrencide '
            'okuma kaygısı veya dikkat şikayeti yoksa rutin takip yeterli olabilir. '
            'Şüphe halinde okul rehberliğine (RAM) yönlendirilebilir.'
        )
    parts = [
        'Özet, göz hareketi deseninde orta düzeyde dalgalanma veya geri dönüşler '
        'olduğunu düşündürüyor (tıbbi teşhis değildir).',
    ]
    if regress_ratio > 0.12 or mean_dispersion > 160:
        parts.append(
            'Okuma akıcılığı ve göz izleme için sınıf öğretmeni ve okul rehber '
            'öğretmeni (RAM) ile değerlendirme önerilir.'
        )
    if fixation_like > n * 0.35:
        parts.append(
            'Sık duraklama benzeri örüntüler için dil-konuşma veya detaylı okuma '
            'taraması uzmanıyla görüşme değerlendirilebilir.'
        )
    parts.append(
        'Klinik karar için mutlaka yüz yüze değerlendirme gerekir; bu çıktı yalnızca '
        'yönlendirme amaçlıdır.'
    )
    return ' '.join(parts)


def mock_analyze_reading(body: AnalyzeRequest) -> AnalyzeResponse:
    samples = body.gazeSamples
    empty_chart = ChartSeries()

    if not samples:
        return AnalyzeResponse(
            risk_label='Orta Risk',
            summary_text=(
                'Göz hareketi kaydı bulunamadı. Kamera ve kalibrasyonla tekrar '
                'deneyin; okuma sırasında ekrana baktığınızdan emin olun.'
            ),
            metrics={
                'duration_ms': 0,
                'sample_count': 0,
                'mean_dispersion_px': 0.0,
                'fixation_like_events': 0,
                'regression_events': 0,
            },
            ram_guidance=(
                'Ölçüm alınamadığı için risk özeti üretilemedi. Tekrar deneme sonrası '
                'okul rehberliği (RAM) ile görüşmeyi düşünebilirsiniz.'
            ),
            chart_series=empty_chart,
        )

    n = len(samples)
    xs = [s.x for s in samples]
    ys = [s.y for s in samples]
    ts = [s.t for s in samples]
    t_min, t_max = min(ts), max(ts)
    duration_ms = max(0, t_max - t_min)

    mx = sum(xs) / n
    my = sum(ys) / n
    var = sum((x - mx) ** 2 + (y - my) ** 2 for x, y in zip(xs, ys)) / n
    mean_dispersion = math.sqrt(var)

    fixation_like = 0
    move_thresh = 28.0
    for i in range(1, n):
        if _dist(xs[i], ys[i], xs[i - 1], ys[i - 1]) < move_thresh:
            fixation_like += 1

    regression_events = 0
    regress_thresh = 38.0
    for i in range(1, n):
        if xs[i] - xs[i - 1] < -regress_thresh:
            regression_events += 1

    regress_ratio = regression_events / max(1, n - 1)

    if n < 8 or duration_ms < 1500:
        risk = 'Orta Risk'
        summary = (
            f'{n} örnek ve yaklaşık {duration_ms / 1000:.1f} sn süre ile sınırlı veri. '
            'Daha uzun ve rahat bir okuma tekrarı önerilir.'
        )
    elif mean_dispersion > 200 or regress_ratio > 0.18:
        risk = 'Orta Risk'
        summary = (
            f'Yaklaşık {duration_ms / 1000:.1f} sn okuma; bakışın ekran üzerinde '
            f'ortalama sapması yüksek (~{mean_dispersion:.0f} px) ve/veya metne '
            f'geri dönüş izlenimi ({regression_events} olay). Göz koordinasyonu veya '
            'okuma zorluğu açısından takip önerilir.'
        )
    else:
        risk = 'Düşük Risk'
        summary = (
            f'Yaklaşık {duration_ms / 1000:.1f} sn süren okumada {n} göz örneği alındı. '
            f'Bakış dağılımı görece stabil (ortalama sapma ~{mean_dispersion:.0f} px). '
            'MVP ölçümü; klinik yorum için uzman değerlendirmesi gerekir.'
        )

    chart = _build_dispersion_chart_series(xs, ys, ts, mx, my, t_min)
    ram = _ram_guidance(risk, regress_ratio, mean_dispersion, fixation_like, n)

    return AnalyzeResponse(
        risk_label=risk,
        summary_text=summary,
        metrics={
            'duration_ms': duration_ms,
            'sample_count': n,
            'mean_dispersion_px': round(mean_dispersion, 2),
            'fixation_like_events': fixation_like,
            'regression_events': regression_events,
        },
        ram_guidance=ram,
        chart_series=chart,
    )


@app.post('/analyze', response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    return mock_analyze_reading(payload)
