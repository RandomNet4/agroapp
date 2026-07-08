"use client";

import { Modal, Table, Divider, Row, Col, Statistic, Tag } from "antd";

import { ProfitTransaction } from "@/types/profit-report";

interface BatchDetailsModalProps {
  transaction: ProfitTransaction;
  visible: boolean;
  onClose: () => void;
}

export function BatchDetailsModal({
  transaction,
  visible,
  onClose,
}: BatchDetailsModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const batchColumns = [
    {
      title: "Tanggal Masuk",
      dataIndex: "tanggalMasuk",
      key: "tanggalMasuk",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Qty Digunakan (kg)",
      dataIndex: "jumlahDigunakan",
      key: "jumlahDigunakan",
      align: "right" as const,
      render: (qty: number) => qty.toFixed(2),
    },
    {
      title: "Harga Beli/kg",
      dataIndex: "hargaBeli",
      key: "hargaBeli",
      align: "right" as const,
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Total Harga Beli",
      dataIndex: "totalHargaBeli",
      key: "totalHargaBeli",
      align: "right" as const,
      render: (total: number) => formatCurrency(total),
    },
  ];

  return (
    <Modal
      title={`Detail Batch - Pesanan ${transaction.nomorPesanan}`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <Divider>Informasi Transaksi</Divider>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12}>
          <Statistic
            title="Tanggal Transaksi"
            value={formatDate(transaction.tanggalTransaksi)}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Jumlah Terjual"
            value={transaction.jumlahTerjual}
            suffix="kg"
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Harga Jual/kg"
            value={formatCurrency(transaction.hargaJual)}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Total Harga Jual"
            value={formatCurrency(transaction.totalHargaJual)}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
      </Row>

      <Divider>Detail Batch FIFO</Divider>

      <Table
        columns={batchColumns}
        dataSource={transaction.batchDetails}
        pagination={false}
        rowKey="stokMasukId"
        size="small"
        className="mb-6"
      />

      <Divider>Ringkasan Keuntungan</Divider>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Statistic
            title="Total Harga Beli (FIFO)"
            value={formatCurrency(transaction.totalHargaBeli)}
            valueStyle={{ color: "#ff4d4f" }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Total Harga Jual"
            value={formatCurrency(transaction.totalHargaJual)}
            valueStyle={{ color: "#1890ff" }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Keuntungan"
            value={formatCurrency(transaction.keuntungan)}
            valueStyle={{
              color: transaction.keuntungan >= 0 ? "#52c41a" : "#ff4d4f",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Persentase Keuntungan"
            value={transaction.persenKeuntungan}
            suffix="%"
            precision={2}
            valueStyle={{
              color: transaction.persenKeuntungan >= 0 ? "#52c41a" : "#ff4d4f",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          />
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Tag color="blue">
            Metode Perhitungan: FIFO (First In First Out) dengan Weighted
            Average
          </Tag>
        </Col>
        <Col xs={24}>
          <Tag color="cyan">
            Batch Details: {transaction.batchDetails.length} batch digunakan
          </Tag>
        </Col>
      </Row>
    </Modal>
  );
}
