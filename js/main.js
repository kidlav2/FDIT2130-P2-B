const d3 = window.d3;
const Papa = window.Papa;

const ROAD_TYPES = ['Highway', 'Rural', 'Urban'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];
const LIGHTS = ['Daylight', 'Dim', 'Night'];

const colors = {
  Highway: getCssVar('--color-highway'),
  Rural: getCssVar('--color-rural'),
  Urban: getCssVar('--color-urban'),
  Morning: getCssVar('--color-morning'),
  Afternoon: getCssVar('--color-afternoon'),
  Evening: getCssVar('--color-evening'),
  Daylight: getCssVar('--color-daylight'),
  Dim: getCssVar('--color-dim'),
  Night: getCssVar('--color-night'),
  Grid: getCssVar('--gridline')
};

const sampleData = [
  { id: 1, road_type: 'Highway', curvature: 0.15, time_of_day: 'Morning', lighting: 'Daylight', num_reported_accidents: 1.9 },
  { id: 2, road_type: 'Highway', curvature: 0.35, time_of_day: 'Afternoon', lighting: 'Daylight', num_reported_accidents: 2.2 },
  { id: 3, road_type: 'Highway', curvature: 0.72, time_of_day: 'Evening', lighting: 'Dim', num_reported_accidents: 3.2 },
  { id: 4, road_type: 'Highway', curvature: 0.86, time_of_day: 'Evening', lighting: 'Night', num_reported_accidents: 3.6 },
  { id: 5, road_type: 'Rural', curvature: 0.18, time_of_day: 'Morning', lighting: 'Daylight', num_reported_accidents: 1.5 },
  { id: 6, road_type: 'Rural', curvature: 0.48, time_of_day: 'Afternoon', lighting: 'Dim', num_reported_accidents: 2.1 },
  { id: 7, road_type: 'Rural', curvature: 0.63, time_of_day: 'Evening', lighting: 'Dim', num_reported_accidents: 2.9 },
  { id: 8, road_type: 'Rural', curvature: 0.91, time_of_day: 'Evening', lighting: 'Night', num_reported_accidents: 3.0 },
  { id: 9, road_type: 'Urban', curvature: 0.11, time_of_day: 'Morning', lighting: 'Daylight', num_reported_accidents: 1.6 },
  { id: 10, road_type: 'Urban', curvature: 0.42, time_of_day: 'Afternoon', lighting: 'Dim', num_reported_accidents: 2.0 },
  { id: 11, road_type: 'Urban', curvature: 0.66, time_of_day: 'Evening', lighting: 'Dim', num_reported_accidents: 2.5 },
  { id: 12, road_type: 'Urban', curvature: 0.83, time_of_day: 'Evening', lighting: 'Night', num_reported_accidents: 2.8 }
];

init();

async function init() {
  const rows = await loadData();
  renderAll(rows);
  setupStoryInteractions(rows);
  setupTopControls();
  window.addEventListener('resize', () => renderAll(rows));
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function loadData() {
  const errorBanner = document.getElementById('errorBanner');
  const sources = ['/data/road_accidents.csv', './data/road_accidents.csv'];

  for (const src of sources) {
    try {
      const response = await fetch(src, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      if (parsed.errors?.length) {
        continue;
      }
      const cleaned = parsed.data.map(normalizeRow).filter(Boolean);
      if (cleaned.length) {
        return cleaned;
      }
    } catch {
      continue;
    }
  }

  errorBanner.classList.add('active');
  return sampleData.map(normalizeRow).filter(Boolean);
}

function normalizeRow(r) {
  if (!r) return null;
  const accidents = Number(r.num_reported_accidents);
  const curvature = Number(r.curvature);

  if (!Number.isFinite(accidents)) return null;

  return {
    id: r.id,
    road_type: normalizeRoad(r.road_type),
    num_lanes: Number(r.num_lanes),
    curvature: Number.isFinite(curvature) ? curvature : 0,
    speed_limit: Number(r.speed_limit),
    lighting: normalizeLight(r.lighting),
    weather: r.weather,
    road_signs_present: r.road_signs_present,
    public_road: r.public_road,
    time_of_day: normalizeTime(r.time_of_day),
    holiday: r.holiday,
    school_season: r.school_season,
    num_reported_accidents: accidents
  };
}

function normalizeRoad(v) {
  const x = String(v || '').toLowerCase();
  if (x.includes('high')) return 'Highway';
  if (x.includes('rural')) return 'Rural';
  return 'Urban';
}

function normalizeTime(v) {
  const x = String(v || '').toLowerCase();
  if (x.includes('morn')) return 'Morning';
  if (x.includes('after')) return 'Afternoon';
  return 'Evening';
}

function normalizeLight(v) {
  const x = String(v || '').toLowerCase();
  if (x.includes('day')) return 'Daylight';
  if (x.includes('dim') || x.includes('dusk') || x.includes('dawn')) return 'Dim';
  return 'Night';
}

function average(rows) {
  return rows.length ? d3.mean(rows, d => d.num_reported_accidents) : 0;
}

function renderAll(rows) {
  renderStory1(rows);
  renderStory2(rows);
  renderStory3(rows);
  updateIndicatorA({ mode: 'default', rows });
  updateIndicatorB(rows, { mode: 'default', rows });
}

function makeSvg(containerId, margin = { top: 8, right: 8, bottom: 10, left: 10 }) {
  const host = document.getElementById(containerId);
  host.innerHTML = '';
  const width = host.clientWidth || 320;
  const height = host.clientHeight || 200;
  const svg = d3.select(host)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  return {
    svg,
    width,
    height,
    innerW: Math.max(10, width - margin.left - margin.right),
    innerH: Math.max(10, height - margin.top - margin.bottom),
    margin
  };
}

function renderStory1(rows) {
  const { svg, innerW, innerH, margin } = makeSvg('story1Chart', { top: 10, right: 14, bottom: 18, left: 14 });
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const data = ROAD_TYPES.map(road => ({
    road,
    points: TIMES.map(t => ({
      time: t,
      value: average(rows.filter(r => r.road_type === road && r.time_of_day === t))
    }))
  }));

  const yMax = d3.max(data.flatMap(s => s.points.map(p => p.value))) || 1;
  const x = d3.scalePoint().domain(TIMES).range([0, innerW]).padding(0.2);
  const y = d3.scaleLinear().domain([0, yMax * 1.15]).range([innerH, 0]);

  const line = d3.line().x(d => x(d.time)).y(d => y(d.value));

  data.forEach(series => {
    g.append('path')
      .datum(series.points)
      .attr('fill', 'none')
      .attr('stroke', colors[series.road])
      .attr('stroke-width', 1.5)
      .attr('d', line);

    g.selectAll(`.dot-${series.road}`)
      .data(series.points)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.time))
      .attr('cy', d => y(d.value))
      .attr('r', 5)
      .attr('fill', colors[series.road]);
  });
}

function renderStory2(rows) {
  const { svg, innerW, innerH, margin } = makeSvg('story2Chart', { top: 10, right: 10, bottom: 16, left: 10 });
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0001];
  const labels = ['0–0.2', '0.2–0.4', '0.4–0.6', '0.6–0.8', '0.8–1.0'];

  const data = ROAD_TYPES.map(road => ({
    road,
    points: labels.map((label, i) => {
      const min = bins[i];
      const max = bins[i + 1];
      const subset = rows.filter(r => r.road_type === road && r.curvature >= min && r.curvature < max);
      return { bin: label, value: average(subset) };
    })
  }));

  const yMax = d3.max(data.flatMap(s => s.points.map(p => p.value))) || 1;
  const x = d3.scalePoint().domain(labels).range([0, innerW]).padding(0.2);
  const y = d3.scaleLinear().domain([0, yMax * 1.15]).range([innerH, 0]);
  const line = d3.line().x(d => x(d.bin)).y(d => y(d.value));

  data.forEach(series => {
    g.append('path')
      .datum(series.points)
      .attr('fill', 'none')
      .attr('stroke', colors[series.road])
      .attr('stroke-width', 1.5)
      .attr('d', line);
  });
}

function renderStory3(rows) {
  const { svg, innerW, innerH, margin } = makeSvg('story3Chart', { top: 10, right: 10, bottom: 16, left: 10 });
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const data = LIGHTS.map(light => ({
    light,
    points: TIMES.map(t => ({
      time: t,
      value: average(rows.filter(r => r.lighting === light && r.time_of_day === t))
    }))
  }));

  const yMax = d3.max(data.flatMap(s => s.points.map(p => p.value))) || 1;
  const x = d3.scalePoint().domain(TIMES).range([0, innerW]).padding(0.2);
  const y = d3.scaleLinear().domain([0, yMax * 1.15]).range([innerH, 0]);
  const line = d3.line().x(d => x(d.time)).y(d => y(d.value));

  data.forEach(series => {
    g.append('path')
      .datum(series.points)
      .attr('fill', 'none')
      .attr('stroke', colors[series.light])
      .attr('stroke-width', 1.5)
      .attr('d', line);

    g.selectAll(`.dot-${series.light}`)
      .data(series.points)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.time))
      .attr('cy', d => y(d.value))
      .attr('r', 5)
      .attr('fill', colors[series.light]);
  });
}

function updateIndicatorA(scenario) {
  const rows = scenario.rows;
  const { svg, width, height } = makeSvg('indicatorAChart', { top: 0, right: 0, bottom: 0, left: 0 });
  const r = Math.min(width, height) * 0.35;
  const cx = width / 2;
  const cy = height * 0.52;

  const totals = TIMES.map(t => {
    const subset = rows.filter(row => row.time_of_day === t);
    return {
      label: t,
      total: d3.sum(subset, d => d.num_reported_accidents)
    };
  });

  const totalAll = d3.sum(totals, d => d.total) || 1;
  const pieData = totals.map(d => ({
    ...d,
    share: d.total / totalAll
  }));

  const pie = d3.pie().value(d => d.total).sort(null);
  const arc = d3.arc().innerRadius(r * 0.62).outerRadius(r);

  svg.append('g')
    .attr('transform', `translate(${cx},${cy})`)
    .selectAll('path')
    .data(pie(pieData))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => colors[d.data.label])
    .attr('stroke', '#fff')
    .attr('stroke-width', 1);

  const avg = average(rows);
  const topTime = [...totals].sort((a, b) => b.total - a.total)[0]?.label || 'Morning';

  svg.append('text')
    .attr('x', cx)
    .attr('y', cy - 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#292524')
    .attr('font-size', 15)
    .attr('font-weight', 600)
    .text(`${avg.toFixed(1)} avg`);

  svg.append('text')
    .attr('x', cx)
    .attr('y', cy + 16)
    .attr('text-anchor', 'middle')
    .attr('fill', '#78716c')
    .attr('font-size', 11)
    .text(topTime);

  const legend = d3.select('#indicatorALegend');
  legend.html('');
  const rowsLegend = legend.selectAll('div')
    .data(pieData)
    .enter()
    .append('div')
    .attr('class', 'flex items-center justify-between text-xs text-stone-600 leading-5');

  const left = rowsLegend.append('div').attr('class', 'flex items-center gap-2');
  left.append('span')
    .attr('class', 'inline-block rounded-full')
    .style('width', '8px')
    .style('height', '8px')
    .style('background-color', d => colors[d.label]);
  left.append('span').text(d => d.label);

  rowsLegend.append('div')
    .attr('class', 'tabular-nums')
    .text(d => `${(d.share * 100).toFixed(0)}%`);
}

function updateIndicatorB(allRows, scenario) {
  const rows = scenario.rows;
  const { svg, width, height } = makeSvg('indicatorBChart', { top: 8, right: 10, bottom: 30, left: 8 });
  const g = svg.append('g').attr('transform', 'translate(8,8)');

  const data = ROAD_TYPES.map(road => ({
    road,
    value: average(rows.filter(r => r.road_type === road))
  }));

  const chartW = width - 48;
  const barH = 16;
  const gap = 18;

  const x = d3.scaleLinear().domain([0, (d3.max(data, d => d.value) || 1) * 1.1]).range([0, chartW]);

  data.forEach((d, i) => {
    const y = i * (barH + gap);

    g.append('text')
      .attr('x', 0)
      .attr('y', y + 12)
      .attr('fill', '#78716c')
      .attr('font-size', 11)
      .text(d.road);

    g.append('rect')
      .attr('x', 62)
      .attr('y', y)
      .attr('height', barH)
      .attr('width', x(d.value))
      .attr('rx', 4)
      .attr('fill', colors[d.road]);

    g.append('text')
      .attr('x', 62 + x(d.value) + 6)
      .attr('y', y + 12)
      .attr('fill', '#44403c')
      .attr('font-size', 11)
      .attr('class', 'tabular-nums')
      .text(d.value.toFixed(1));
  });

  const delta = getDeltaForScenario(allRows, scenario.mode);

  svg.append('text')
    .attr('x', 10)
    .attr('y', height - 8)
    .attr('fill', '#57534e')
    .attr('font-size', 12)
    .attr('font-weight', 500)
    .text(`+${delta.toFixed(1)} vs safest`);
}

function getDeltaForScenario(allRows, mode) {
  if (mode === 'story1') {
    const evening = average(allRows.filter(r => r.time_of_day === 'Evening'));
    const morning = average(allRows.filter(r => r.time_of_day === 'Morning'));
    return Math.max(0, evening - morning);
  }
  if (mode === 'story2') {
    const curved = average(allRows.filter(r => r.curvature > 0.6));
    const straight = average(allRows.filter(r => r.curvature <= 0.2));
    return Math.max(0, curved - straight);
  }
  if (mode === 'story3') {
    const dim = average(allRows.filter(r => r.lighting === 'Dim'));
    const daylight = average(allRows.filter(r => r.lighting === 'Daylight'));
    return Math.max(0, dim - daylight);
  }

  const byRoad = ROAD_TYPES.map(road => average(allRows.filter(r => r.road_type === road)));
  return (d3.max(byRoad) || 0) - (d3.min(byRoad) || 0);
}

function setupStoryInteractions(allRows) {
  const story1 = document.getElementById('story1Card');
  const story2 = document.getElementById('story2Card');
  const story3 = document.getElementById('story3Card');

  const resetIndicators = () => {
    updateIndicatorA({ mode: 'default', rows: allRows });
    updateIndicatorB(allRows, { mode: 'default', rows: allRows });
  };

  const bindHover = (el, onEnter) => {
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('focus', onEnter);
    el.addEventListener('mouseleave', resetIndicators);
    el.addEventListener('blur', resetIndicators);
  };

  bindHover(story1, () => {
    const byRoad = ROAD_TYPES.map(road => ({ road, value: average(allRows.filter(r => r.road_type === road)) }));
    const topRoad = byRoad.sort((a, b) => b.value - a.value)[0]?.road || 'Highway';
    const filtered = allRows.filter(r => r.road_type === topRoad);
    updateIndicatorA({ mode: 'story1', rows: filtered });
    const eveningRows = allRows.filter(r => r.time_of_day === 'Evening');
    updateIndicatorB(allRows, { mode: 'story1', rows: eveningRows });
  });

  bindHover(story2, () => {
    const highCurvature = allRows.filter(r => r.curvature > 0.6);
    updateIndicatorA({ mode: 'story2', rows: highCurvature.length ? highCurvature : allRows });
    updateIndicatorB(allRows, { mode: 'story2', rows: highCurvature.length ? highCurvature : allRows });
  });

  bindHover(story3, () => {
    const dimRows = allRows.filter(r => r.lighting === 'Dim');
    updateIndicatorA({ mode: 'story3', rows: dimRows.length ? dimRows : allRows });
    updateIndicatorB(allRows, { mode: 'story3', rows: dimRows.length ? dimRows : allRows });
  });
}

function setupTopControls() {
  const select = document.getElementById('storiesNav');
  select.addEventListener('change', event => {
    if (event.target.value) window.location.href = event.target.value;
  });
}
