using Microsoft.Extensions.ObjectPool;

public class GenericObjectPool<T> where T : class, new()
{
    private readonly ObjectPool<T> _pool;

    public GenericObjectPool(int maxSize = 20)
    {
        var provider = new DefaultObjectPoolProvider
        {
            MaximumRetained = maxSize
        };

        _pool = provider.Create(new DefaultPooledObjectPolicy<T>());
    }

    public T Get()
    {
        return _pool.Get();
    }

    public void Return(T obj)
    {
        _pool.Return(obj);
    }
}
