import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import moment from "moment";
import { cloneDeep } from "lodash";
import Mock from "mockjs";

import store from "./store";

import "./index.less";

const Weeks = 7; // 一周七天
const Ticks = 12; // 一天24小时，2小时为一个刻度，一共12个刻度。
const TickItem = 32; // 每一个刻度宽 32px
const BarHeight = 32; // 班种条形图的高度
const Padding = 10; // 班种条形图上下的内边距
const RowHeight = BarHeight + Padding * 2;
const HourAxisHeight = 32; // 横轴高度
const WeekAxisWidth = 60; // 纵轴宽度
const Width = Ticks * TickItem + WeekAxisWidth + 40;
const Height = Weeks * RowHeight + HourAxisHeight;
const AxisLineColor = "#D7DADB";
const OnDutyColor = "#FCFAE3";
const OnIdleColor = "rgba(255,48,47,0.15)";
const AxisLineWidth = 1;
const Hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const WeekLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const Doctors = [
  {
    lable: "初诊医生",
    value: "diagnose",
  },
  {
    lable: "审核医生",
    value: "audit",
  },
];

const Workers = [
  {
    name: "眼科医生",
    code: "0001",
  },
  {
    name: "耳科医生",
    code: "0002",
  },
  {
    name: "鼻科医生",
    code: "0003",
  },
];

export function getCurrWeek(): any {
  const start = moment().startOf("week");
  const finish = moment().endOf("week");
  return [start, finish];
}

export function getWeekDate(range) {
  const date = moment(range[0]);
  const days = moment(range[1]).diff(moment(range[0]), "days");
  return Array.from({ length: days + 1 }).map((_, i) =>
    moment(date).add(i, "days").get("date")
  );
}

Mock.Random.extend({
  doctor() {
    return this.pick(Doctors);
  },
  ranges() {
    const days = Mock.Random.integer(0, 6);
    const min = Mock.Random.integer(0, 12);
    const max = Mock.Random.integer(min, min + Mock.Random.integer(0, 11));
    const date1 = moment().startOf("week").add(days, "days").add(min, "hours");
    const date2 = moment().startOf("week").add(days, "days").add(max, "hours");
    return [date1.format("YYYY-MM-DD HH:mm"), date2.format("YYYY-MM-DD HH:mm")];
  },
  worker() {
    return this.pick(Workers);
  },
});

interface IWorker {
  doctor: { label: string; value: string };
  worker: { code: string; name: string };
  ranges: any[];
}

interface IState {
  range: any[];
  dates: number[];
  works: any[];
}

interface IProps {
}

interface IChartProps {
  works: any[];
  title: string;
}

interface IChartState {
  canvas: any;
}

/**
 * 当前日期是星期几
 * @param date
 * @returns [0 ~ 6]
 */
function getWeek(date) {
  return moment(date).weekday();
}

/**
 * 贪心算法合并区间
 */
function mergeInterval(intervals) {
  intervals.sort((a, b) => (moment(a[0]).isBefore(b[0]) ? -1 : 1));
  let prev = intervals[0];
  const result = [];
  for (let i = 0; i < intervals.length; i++) {
    const cur = intervals[i];
    if (cur[0] > prev[1]) {
      result.push(prev);
      prev = cur;
    } else {
      // prev[1] = Math.max(cur[1], prev[1])
      prev[1] = moment(cur[1]).isAfter(prev[1]) ? cur[1] : prev[1];
    }
  }
  result.push(prev);
  return result;
}

function getStartDate(date) {
  const temp = moment(date).format("YYYY-MM-DD");
  return moment(temp).format("YYYY-MM-DD HH:mm");
}

function getLastDate(date) {
  let temp = moment(moment(date).format("YYYY-MM-DD"));
  temp = moment(temp).add(24, "hours");
  return moment(temp).format("YYYY-MM-DD HH:mm");
}

/**
 * 检查当日是否没有排班
 * 合并区间
 * 总区间 - 合并区间
 */
function getIdleInterval(works: any[]) {
  const ranges = works.map((elem) => elem.ranges);
  const intervals = mergeInterval(cloneDeep(ranges));
  const idles: any[] = [];
  let prev = getStartDate(ranges[0][0]);
  for (let i = 0; i < intervals.length; i++) {
    if (!moment(prev).isSame(intervals[i][0])) {
      idles.push([prev, intervals[i][0]]);
    }
    prev = intervals[i][1];
  }
  idles.push([prev, getLastDate(ranges[0][0])]);
  return idles;
}

// todo 边界逻辑检查
class BarChartTime extends React.Component<IChartProps, IChartState> {
  constructor(props) {
    super(props);
    this.state = {
      canvas: React.createRef(),
    };
  }

  render() {
    return (
      <div className="barchart">
        <div className="title">{this.props.title}</div>
        <canvas
          className="canvas"
          width={Width}
          height={Height}
          ref={this.state.canvas}
        >
          你的浏览器不支持Canvas
        </canvas>
      </div>
    );
  }

  componentDidMount() {
    const ctx = this.getContext();
    if (ctx instanceof CanvasRenderingContext2D) {
      this.setHourAxis(ctx);
      this.setWeekAxis(ctx);
      this.drawRowGrid(ctx);
      // this.drawHelpers(ctx);
      this.addChartBar(ctx);
    }
  }

  getContext() {
    const { canvas } = this.state;
    if (!canvas || !canvas.current) {
      throw new Error("找不到canvas元素");
    }
    return canvas.current.getContext("2d");
  }

  /**
   * X 轴 0-24 小时
   */
  setHourAxis(ctx: CanvasRenderingContext2D) {
    const top = 8;
    ctx.font = "14px serif";
    Hours.forEach(function (hour, index) {
      ctx.strokeText(
        hour.toString(),
        WeekAxisWidth + index * TickItem,
        HourAxisHeight / 2 + top
      );
    });
    ctx.font = "14px serif";
    ctx.strokeText("/h", Width - 20, HourAxisHeight / 2 + top);
  }

  /**
   * Y 轴 周一到周日
   */
  setWeekAxis(ctx: CanvasRenderingContext2D) {
    const top = 4;
    ctx.font = "14px serif";
    WeekLabels.forEach(function (label, index) {
      ctx.strokeText(
        label,
        WeekAxisWidth / 3,
        HourAxisHeight + RowHeight * index + RowHeight / 2 + top
      );
    });
  }

  /**
   * 绘制横向网格线
   */
  drawRowGrid(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.strokeStyle = AxisLineColor;
    ctx.lineWidth = AxisLineWidth;
    Array.from({ length: Weeks + 1 }).forEach(function (_, index) {
      ctx.moveTo(0, HourAxisHeight + index * RowHeight);
      ctx.lineTo(Width, HourAxisHeight + index * RowHeight);
    });
    ctx.stroke();
  }

  addChartBar(ctx: CanvasRenderingContext2D) {
    const works = this.props.works;
    Object.keys(works).forEach((key) => {
      const week = getWeek(key);
      const data = works[key];
      this.drawWeekBar(ctx, week, data);
    });
  }

  /**
   * 绘制周一到周日的排班情况
   */
  drawWeekBar(ctx: CanvasRenderingContext2D, week: number, works: any[]) {
    const idles = getIdleInterval(works);
    if (idles.length === 0) {
      this.drawFullBar(ctx, week);
      return;
    }
    works.forEach((work) => {
      this.drawWorkBar(ctx, week, work);
    });
    idles.forEach((idle) => {
      this.drawIdleBar(ctx, week, idle);
    });
    console.log("week: ", week, " idles: ", idles);
  }

  drawWorkBar(ctx: CanvasRenderingContext2D, week: number, work: any) {
    const start = moment(work.ranges[0]).get("hours");
    const duration = moment(work.ranges[1]).diff(
      moment(work.ranges[0]),
      "hours"
    );
    const px = WeekAxisWidth + (start / 2.0) * TickItem;
    const py = RowHeight * week + HourAxisHeight + Padding;
    const width = (duration / 2.0) * TickItem;
    const height = BarHeight;
    ctx.fillStyle = OnDutyColor;
    ctx.fillRect(px, py, width, height);
    // ctx.font = "14px serif";
    // ctx.strokeText(work.worker.name, px, py);
  }

  drawIdleBar(ctx: CanvasRenderingContext2D, week: number, idle: any) {
    const start = moment(idle[0]).get("hours");
    const duration = moment(idle[1]).diff(moment(idle[0]), "hours");
    const px = WeekAxisWidth + (start / 2.0) * TickItem;
    const py = RowHeight * week + HourAxisHeight + 1;
    const width = (duration / 2.0) * TickItem;
    const height = RowHeight - 2;
    ctx.fillStyle = OnIdleColor;
    ctx.fillRect(px, py, width, height);

    // 当空闲时间小于两小时时，不显示辅助元素
    if (duration >= 2) {
      const cx = px + width / 2.0;
      const cy = py + height / 2.0;
      const radius = 7;
      ctx.beginPath();
      ctx.strokeStyle = "#ff0000";
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.moveTo(cx, cy - radius + 2);
      ctx.lineTo(cx, cy + radius - 6);
      ctx.moveTo(cx, cy + radius - 4);
      ctx.lineTo(cx, cy + radius - 2);
      ctx.stroke();
    }
  }

  drawFullBar(ctx: CanvasRenderingContext2D, week: number) {
    console.log();
  }

  drawToolTip() { }

  /**
   * 绘制临时辅助线
   * 开发完成要注释
   */
  drawHelpers(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.strokeStyle = AxisLineColor;
    ctx.lineWidth = AxisLineWidth;
    ctx.moveTo(WeekAxisWidth, 0);
    ctx.lineTo(WeekAxisWidth, Height);
    ctx.stroke();
  }
}

class StatisTime extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);
    const range = getCurrWeek();
    const dates = getWeekDate(range);
    this.state = {
      range: [...range],
      dates: [...dates],
      works: [],
    };
  }

  render() {
    const works = this.formatData();
    return (
      <>
        <section className="charts">
          {/* 初诊班种时间分布 */}
          <BarChartTime title="初诊班种时段分布情况" works={works.diagnose} />
          {/* 审核班种时间分布 */}
          <BarChartTime title="审核班种时段分布情况" works={works.audit} />
        </section>
      </>
    );
  }

  componentDidMount() { }

  componentDidUpdate() { }

  componentWillUnmount() { }

  formatData() {
    const workers = Mock.mock({
      "list|100": [
        {
          worker: "@worker",
          ranges: "@ranges",
          doctor: "@doctor",
        },
      ],
    }).list;
    const diagnoseData = workers.filter(
      (elem: IWorker) => elem.doctor.value === "diagnose"
    );
    const auditData = workers.filter(
      (elem: IWorker) => elem.doctor.value === "audit"
    );
    const result1 = new Map();
    const result2 = new Map();
    diagnoseData.forEach((elem: IWorker) => {
      const day = moment(elem.ranges[0]).format("YYYY-MM-DD");
      if (!result1.has(day)) {
        result1.set(day, []);
      }
      const values = result1.get(day);
      values.push(elem);
      result1.set(day, values);
    });
    auditData.forEach((elem: IWorker) => {
      const day = moment(elem.ranges[0]).format("YYYY-MM-DD");
      if (!result2.has(day)) {
        result2.set(day, []);
      }
      const values = result2.get(day);
      values.push(elem);
      result2.set(day, values);
    });

    function strMapToObj(strMap: any) {
      const obj = Object.create(null);
      for (const [k, v] of strMap) {
        obj[k] = v;
      }
      return obj;
    }

    return {
      diagnose: strMapToObj(result1),
      audit: strMapToObj(result2),
    };
  }
}

const root = ReactDOM.createRoot(document.getElementById("app") as HTMLElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <StatisTime />
    </Provider>,
  </React.StrictMode>
);