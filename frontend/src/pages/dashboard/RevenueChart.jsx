import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RevenueChart = ({ monthlySales = [] }) => {
  const labels = monthlySales.length
    ? monthlySales.map((item) => item._id)
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenueData = monthlySales.length
    ? monthlySales.map((item) => item.totalSales)
    : [0, 0, 0, 0, 0, 0];

  const data = {
    labels,
    datasets: [
      {
        label: 'Revenue (USD)',
        data: revenueData,
        backgroundColor: 'rgba(34, 197, 94, 0.7)', 
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Revenue',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="w-full rounded-2xl bg-white">
      <div className='hidden md:block'>
      <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default RevenueChart;
