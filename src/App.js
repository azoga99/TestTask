import React, { useState, useEffect } from 'react';
import md5 from 'md5';
import './styles.css'

const API_URL = 'https://api.valantis.store:41000/';

// ... (ваш импорт и константы)

const App = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterParams, setFilterParams] = useState({});
  const [selectedField, setSelectedField] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const password = 'Valantis';
        const authString = md5(`${password}_${timestamp}`);

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth': authString,
          },
        };

        if (Object.keys(filterParams).length > 0) {
          requestOptions.body = JSON.stringify({
            action: 'filter',
            params: filterParams,
          });
        } else {
          requestOptions.body = JSON.stringify({
            action: 'get_ids',
            params: {
              offset: (currentPage - 1) * 50,
              limit: 50,
            },
          });
        }

        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();

        if (!response.ok) {
          console.error('Ошибка при получении идентификаторов продуктов:', data);
          return;
        }

        const uniqueIds = Array.from(new Set(data.result));
        setProducts(uniqueIds);

        const totalResponse = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth': authString,
          },
          body: JSON.stringify({
            action: 'get_ids',
            params: filterParams,
          }),
        });

        const totalData = await totalResponse.json();

        if (!totalResponse.ok) {
          console.error('Ошибка при получении общего количества продуктов:', totalData);
          return;
        }

        setTotalPages(Math.ceil(totalData.result.length / 50));
      } catch (error) {
        console.error('Ошибка при получении данных:', error);
      }
    };

    fetchProducts();
  }, [currentPage, filterParams]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = (filter) => {
    setFilterParams(filter);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterParams({});
    setCurrentPage(1);
    setSelectedField(null);
  };

  return (
    <div>
      <h1>Список продуктов</h1>
      <FilterForm
        onFilterChange={handleFilterChange}
        onFieldChange={setSelectedField}
        onResetFilters={handleResetFilters}
        selectedField={selectedField}
      />
      <ul>
        {products.map((productId) => (
          <Product key={productId} productId={productId} />
        ))}
      </ul>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
};

const FilterForm = ({ onFilterChange, onFieldChange, onResetFilters, selectedField }) => {
  const [filter, setFilter] = useState({});
  const [fields, setFields] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilter((prevFilter) => ({ ...prevFilter, [name]: value }));
  };

  const handleFieldChange = async (field) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const password = 'Valantis';
    const authString = md5(`${password}_${timestamp}`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': authString,
      },
      body: JSON.stringify({
        action: 'get_fields',
        params: { field },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setFields(data.result.filter((value) => value !== null));
      onFieldChange(field);
    } else {
      console.error('Ошибка при получении значений поля:', data);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterChange(filter);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Название:
        <input type="text" name="product" onChange={handleChange} />
      </label>
      <label>
        Цена:
        <input type="number" name="price" onChange={handleChange} />
      </label>
      <label>
        Бренд:
        <input type="text" name="brand" onChange={handleChange} />
        <button type="button" onClick={() => handleFieldChange('brand')}>
          Получить бренды
        </button>
        {selectedField === 'brand' && fields.length > 0 && (
          <select name="brand" onChange={handleChange}>
            <option value="">Выберите бренд</option>
            {fields.map((field, index) => (
              <option key={index} value={field}>
                {field}
              </option>
            ))}
          </select>
        )}
      </label>
      <button type="submit">Применить фильтр</button>
      <button type="button" onClick={onResetFilters}>
        Сбросить фильтры
      </button>
    </form>
  );
};

const Product = ({ productId }) => {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const password = 'Valantis';
        const authString = md5(`${password}_${timestamp}`);

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth': authString,
          },
          body: JSON.stringify({
            action: 'get_items',
            params: { ids: [productId] },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Ошибка при получении данных о продукте:', data);
          return;
        }

        setProduct(data.result[0]);
      } catch (error) {
        console.error('Ошибка при получении данных о продукте:', error);
      }
    };

    fetchProductData();
  }, [productId]);

  return (
    <li>
      {product ? (
        <>
          <p>ID: {product.id}</p>
          <p>Название: {product.product}</p>
          <p>Цена: {product.price}</p>
          <p>Бренд: {product.brand || 'Н/Д'}</p>
        </>
      ) : (
        <p>Загрузка данных о продукте...</p>
      )}
    </li>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        Предыдущая
      </button>
      <span>{`Страница ${currentPage} из ${totalPages}`}</span>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Следующая
      </button>
    </div>
  );
};

export default App;
