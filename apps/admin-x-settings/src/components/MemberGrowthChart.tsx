import React from 'react';

interface DataPoint {
    date: string;
    count: number;
}

interface MemberGrowthChartProps {
    data: DataPoint[];
    startDate: string;
    endDate: string;
}

const MemberGrowthChart: React.FC<MemberGrowthChartProps> = ({
    data,
    startDate,
    endDate
}) => {
    const maxValue = Math.max(...data.map(d => d.count));

    const calculateBarHeight = (count: number) => {
        if (maxValue === 0) {
            return 0;
        }
        return (count / maxValue) * 100;
    };

    return (
        <div className="member-growth-chart" data-testid="member-growth-chart">
            <div className="chart-header">
                <h3>Member Growth</h3>
                <div className="date-range" data-testid="date-range">
                    {startDate} to {endDate}
                </div>
            </div>

            <div className="chart-container">
                {data.length === 0 ? (
                    <div className="no-data" data-testid="no-data-message">
                        No data available for this period
                    </div>
                ) : (
                    <div className="bars">
                        {data.map((point, idx) => (
                            <div key={idx} className="bar-wrapper">
                                <div
                                    className="bar"
                                    style={{height: `${calculateBarHeight(point.count)}%`}}
                                    data-testid={`bar-${idx}`}
                                />
                                <div className="bar-label">{point.date}</div>
                                <div className="bar-count">{point.count}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="chart-stats" data-testid="chart-stats">
                <div className="stat">
                    <span>Total New Members:</span>
                    <span data-testid="total-count">
                        {data.reduce((sum, d) => sum + d.count, 0)}
                    </span>
                </div>
                <div className="stat">
                    <span>Peak Day:</span>
                    <span data-testid="peak-value">{maxValue}</span>
                </div>
            </div>
        </div>
    );
};

export default MemberGrowthChart;
